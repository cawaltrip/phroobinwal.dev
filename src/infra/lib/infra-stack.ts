import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GithubProps } from "./utils/github-props";
import {CloudFrontDistributionStack, CloudFrontDistributionStackProps} from "./static-website/distribution";
import {aws_s3_deployment as s3_deployment} from "aws-cdk-lib";

export interface InfraStackProps extends CloudFrontDistributionStackProps {
  github: GithubProps;
}

export class InfraStack extends CloudFrontDistributionStack {
  public readonly deployment: s3_deployment.BucketDeployment;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // Deploy our site to S3
    this.deployment = new s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3_deployment.Source.asset(this.publicBucketDataPath)],
      destinationBucket: this.publicBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
  }
}
