import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib"
import {
  aws_certificatemanager as acm,
  aws_cloudfront as cf,
  aws_iam as iam,
  aws_route53 as route53,
} from "aws-cdk-lib";
import {
  SecureBucket,
  SecureBucketProps
} from "./secure-bucket";
import { DeploymentType } from "../utils/deployment-type";

export interface WebsiteBackendStackProps extends cdk.StackProps {
  publicBucketName: string;
  privateBucketName?: string;
  loggingBucketName: string;
  hasPrivateData?: boolean;
  deploymentType: DeploymentType;
  publicBucketDataPath: string;
  privateBucketDataPath?: string;
  domainName: string;
  generateWildcardCertificate?: boolean;
}
export class WebsiteBackendStack extends cdk.Stack {
  // Domain variables
  public readonly domainName: string;
  public readonly certificate: acm.Certificate;
  public readonly wildcardCertificate?: acm.Certificate;
  public readonly hostedZone: route53.IHostedZone;
  public readonly aRecords: route53.ARecord[];

  // Storage variables
  public readonly publicBucket: SecureBucket;
  public readonly publicBucketDataPath: string;
  public readonly privateBucket?: SecureBucket;
  public readonly privateBucketDataPath?: string;
  public readonly loggingBucket: SecureBucket;

  constructor(scope: Construct, id: string, props: WebsiteBackendStackProps) {
    super(scope, id, props);

    // Create the domain
    this.domainName = props.domainName;

    // Go through and do error checking before going further.
    this.hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: this.domainName,
    });
    if (!this.hostedZone) {
      throw new Error("Hosted Zone could not be found.");
    }

    // Base certificate
    this.certificate = new acm.DnsValidatedCertificate(this, "WebsiteCertificate", {
      domainName: this.domainName,
      hostedZone: this.hostedZone,
      region: "us-east-1", // Must be in us-east-1 for certs.
    });
    new cdk.CfnOutput(this, "CertificateArn", {
      value: `${this.certificate.certificateArn}`,
      description: "ARN for the top-level certificate",
      exportName: "CertificateArn"
    });

    // Wildcard certificate if desired
    if (props.generateWildcardCertificate) {
      this.wildcardCertificate = new acm.DnsValidatedCertificate(this, "WildcardWebsiteCertificate", {
        domainName: `*.${this.domainName}`,
        hostedZone: this.hostedZone,
        region: "us-east-1",
      });

      new cdk.CfnOutput(this, "WildcardCertificateArn", {
        value: `${this.wildcardCertificate.certificateArn}`,
        description: "ARN for the wildcard certificate",
        exportName: "WildcardCertificateArn"
      });
    }

    // Set up the website storage.
    this.publicBucketDataPath = props.publicBucketDataPath;
    if (props.hasPrivateData && props.privateBucketDataPath) {
      this.privateBucketDataPath = props.privateBucketDataPath;
    }

    this.publicBucket = new WebsiteBucket(this, "PublicWebsiteData", {
      bucketName: props.publicBucketName,
      deploymentType: props.deploymentType,
    });

    if (props.hasPrivateData && props.privateBucketName) {
      this.privateBucket = new WebsiteBucket(this, "PrivateWebsiteData", {
        bucketName: props.privateBucketName,
        deploymentType: props.deploymentType,
      });
    }

    this.loggingBucket = new WebsiteBucket(this, "WebsiteLoggingBucket", {
      bucketName: props.loggingBucketName,
      deploymentType: props.deploymentType,
    });

    // Configure the access policy so that CloudFront traffic is the only way our
    // backend can be accessed.
    const accessIdentity = new cf.OriginAccessIdentity(this, "CloudFrontAccess");
    const cfUAP = new iam.PolicyStatement({
      principals: [accessIdentity.grantPrincipal],
      actions: ["s3:GetObject"],
      resources: [
        ...this.arnForObjects("*"),
      ]
    });
  }

  addARecord(id: string, props: route53.ARecordProps) {
    const aRecord = new route53.ARecord(this, id, props)
    if (aRecord) {
      this.aRecords.push(aRecord);
    }
    return aRecord;
  }

  addToResourcePolicy(policyStatement: iam.PolicyStatement) {
    this.publicBucket.addToResourcePolicy(policyStatement);
    if (this.privateBucket) {
      this.privateBucket.addToResourcePolicy(policyStatement);
    }
  }

  arnForObjects(keyPattern: string) {
    let arnList = [this.publicBucket.arnForObjects(keyPattern)];
    if (this.privateBucket) {
      arnList.push(this.privateBucket.arnForObjects(keyPattern));
    }
    return arnList;
  }

  getDataBuckets() {
    let existingBuckets = [this.publicBucket];
    if (this.privateBucket) {
      existingBuckets.push(this.privateBucket);
    }
    return existingBuckets;
  }
}

export interface WebsiteBucketProps extends SecureBucketProps {
  bucketName: string;
  deploymentType: DeploymentType;
}
export class WebsiteBucket extends SecureBucket {
  constructor(scope: Construct, id: string, props: WebsiteBucketProps) {
    const removalPolicy: cdk.RemovalPolicy =
        (props.deploymentType === DeploymentType.DEV) ?
            cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
    let fullProps = {
      ...props,
      removalPolicy: removalPolicy,
      autoDeleteObjects: (removalPolicy === cdk.RemovalPolicy.DESTROY)
    };

    super(scope, id, fullProps);
  }
}