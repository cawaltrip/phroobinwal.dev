import * as fs from "fs";
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_s3_deployment as s3_deployment,
} from "aws-cdk-lib";
import {
  CloudFrontDistributionStack,
  CloudFrontDistributionStackProps
} from "./distribution";

export interface SiteDeploymentStackProps extends CloudFrontDistributionStackProps {
  
}

export class SiteDeploymentStack extends CloudFrontDistributionStack {
  public readonly deployment: s3_deployment.BucketDeployment;

  constructor(scope: Construct, id: string, props: SiteDeploymentStackProps) {
    super(scope, id, props);

    // Deploy our site to S3
    this.deployment = new s3_deployment.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3_deployment.Source.asset(this.storage.publicBucketDataPath)],
      destinationBucket: this.storage.publicBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })
  }
}