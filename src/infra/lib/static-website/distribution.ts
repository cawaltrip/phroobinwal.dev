import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib"
import {
  aws_route53 as route53,
  aws_route53_targets as route53_targets,
  aws_cloudfront as cf,
  aws_cloudfront_origins as cf_origins,
} from "aws-cdk-lib";
import { WebsiteBackendStack, WebsiteBackendStackProps } from "../storage/website-backend";
import { DomainStack } from "../domain/domain";

export interface CloudFrontDistributionStackProps extends WebsiteBackendStackProps {
  domain: DomainStack;
  appName: string;
}

export class CloudFrontDistributionStack extends cdk.Stack {
  public readonly distribution: cf.Distribution;
  public readonly storage: WebsiteBackendStack;

  constructor(scope: Construct, id: string, props: CloudFrontDistributionStackProps) {
    super(scope, id, props);

    // Create the backend
    this.storage = new WebsiteBackendStack(this, "CloudFrontDataStore", props);

    // Create the CloudFront distribution.
    const rootObject = "index.html";
    this.distribution = new cf.Distribution(this, "WebsiteCDN", {
      comment: `CDK CloudFront S3 Dist for ${props.appName} (${props.domain.domainName})`,
      defaultRootObject: rootObject,
      certificate: props.domain.certificate,
      domainNames: [props.domain.domainName],
      enableLogging: true,
      logBucket: this.storage.loggingBucket,
      logFilePrefix: "cf-access-logs/",
      logIncludesCookies: false,
      httpVersion: cf.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: new cf_origins.S3Origin(this.storage.publicBucket),
        compress: true,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS
      },
      errorResponses: [
        {
          // 403 Forbidden
          ttl: cdk.Duration.minutes(1),
          httpStatus: 403,
          // responseHttpStatus: 403,
          // responsePagePath: `/${rootObject}`,
        },
        {
          // 404 Not Found
          ttl: cdk.Duration.minutes(1),
          httpStatus: 404,
          // responseHttpStatus: 404,
          // responsePagePath: `/${rootObject}`,
        }
      ]
    });

    // Add the A Record for this distribution to Route53
    const aRecord = new route53.ARecord(this, "CloudFrontDistributionARecord", {
      recordName: props.domain.domainName,
      target: route53.RecordTarget.fromAlias(new route53_targets.CloudFrontTarget(this.distribution)),
      zone: props.domain.hostedZone
    });
    // const result = props.domain.addARecord("CloudFrontDistribution", {
    //   recordName: props.domain.domainName,
    //   target: route53.RecordTarget.fromAlias(new route53_targets.CloudFrontTarget(this.distribution)),
    //   zone: props.domain.hostedZone,
    // });

    new cdk.CfnOutput(this, "CloudFrontARecord", {
      value: aRecord.toString(),
      description: "CloudFront A Record",
      exportName: "CloudFrontARecord"
    });
    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "CloudFront site path",
      exportName: "CloudFrontURL"
    });
    new cdk.CfnOutput(this, "CloudFrontID", {
      value: this.distribution.distributionId,
      description: "Use this for cache invalidation if needed.",
      exportName: "CloudFrontID"
    });
  }
}