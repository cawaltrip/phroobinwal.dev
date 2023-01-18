import { Construct } from 'constructs';
import {
  aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";
import {
  CloudFrontDistributionStack,
  CloudFrontDistributionStackProps
} from "./distribution";

export interface SiteDeploymentStackProps extends CloudFrontDistributionStackProps {

}

export class SiteDeploymentStack extends CloudFrontDistributionStack {
  public readonly deployment: s3deploy.BucketDeployment;

  constructor(scope: Construct, id: string, props: SiteDeploymentStackProps) {
    super(scope, id, props);

    // Deploy our site to S3
    this.deployment = new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3deploy.Source.asset(this.publicBucketDataPath)],
      destinationBucket: this.publicBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })
  }
}