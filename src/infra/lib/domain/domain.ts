import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib"
import {
  aws_route53 as route53,
  aws_certificatemanager as acm
} from "aws-cdk-lib";


export interface DomainStackProps extends cdk.StackProps {
  domainName: string;
  generateWildcardCertificate?: boolean;
}

export class DomainStack extends cdk.Stack {
  public readonly domainName: string;
  public readonly certificate: acm.Certificate;
  public readonly wildcardCertificate?: acm.Certificate;
  public readonly hostedZone: route53.IHostedZone;
  public readonly aRecords: route53.ARecord[];

  constructor(scope: Construct, id: string, props: DomainStackProps) {
    super(scope, id, props);

    this.domainName = props.domainName;

    // Go through and do error checking before going further.
    this.hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: this.domainName,
    });
    if (!this.hostedZone) {
      throw new Error("Hosted Zone could not be found.");
    }

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
  }

  addARecord(id: string, props: route53.ARecordProps) {
    const aRecord = new route53.ARecord(this, id, props)
    if (aRecord) {
      this.aRecords.push(aRecord);
    }
    return aRecord;
  }

}