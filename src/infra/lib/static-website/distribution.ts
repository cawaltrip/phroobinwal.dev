import {Construct} from "constructs";
import * as cdk from "aws-cdk-lib"
import {
  aws_cloudfront as cf,
  aws_cloudfront_origins as cf_origins,
  aws_route53 as route53,
  aws_route53_targets as route53_targets
} from "aws-cdk-lib"
import {WebsiteBackendStack, WebsiteBackendStackProps} from "../storage/website-backend";
import {BehaviorOptions, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";

export interface CloudFrontDistributionStackProps extends WebsiteBackendStackProps {
  appName: string;
}

export class CloudFrontDistributionStack extends WebsiteBackendStack {
  public readonly distribution: cf.Distribution;

  constructor(scope: Construct, id: string, props: CloudFrontDistributionStackProps) {
    super(scope, id, props);

    const defaultBehaviorBucket = (this.publicBucket) ? this.publicBucket : this.privateBucket!;
    const additionalBehaviorBucket = (this.publicBucket && this.privateBucket) ? this.privateBucket : undefined;

    const defaultBehavior: BehaviorOptions = {
      origin: new cf_origins.S3Origin(defaultBehaviorBucket),
      compress: true,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS
    }

    const additionalBehaviors: { [key: string]: BehaviorOptions } | undefined = (additionalBehaviorBucket) ? {
      "private/*": {
        origin: new cf_origins.S3Origin(additionalBehaviorBucket),
        compress: true,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      }
    } : undefined;

    // Create the CloudFront distribution.
    const rootObject = "index.html";
    this.distribution = new cf.Distribution(this, "WebsiteCDN", {
      comment: `CDK CloudFront S3 Dist for ${props.appName} (${this.domainName})`,
      defaultRootObject: rootObject,
      certificate: this.certificate,
      domainNames: [this.domainName],
      enableLogging: true,
      logBucket: this.loggingBucket,
      logFilePrefix: "cf-access-logs/",
      logIncludesCookies: false,
      httpVersion: cf.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: defaultBehavior,
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


    // defaultBehavior: {
    //   origin: new cf_origins.S3Origin(this.publicBucket),
    //       compress: true,
    //       viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS
    // },

    // Add the A Record for this distribution to Route53
    const aRecord = new route53.ARecord(this, "CloudFrontDistributionARecord", {
      recordName: this.domainName,
      target: route53.RecordTarget.fromAlias(new route53_targets.CloudFrontTarget(this.distribution)),
      zone: this.hostedZone
    });

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