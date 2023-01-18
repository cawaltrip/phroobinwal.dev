import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GithubProps } from "./utils/github-props";
import { SiteDeploymentStack } from "./static-website/deployment";
import { DeploymentType } from "./utils/deployment-type";
import { WebsiteBackendStack } from "./storage/website-backend";
import { DomainStack } from "./domain/domain";
import {CloudFrontDistributionStack} from "./static-website/distribution";

export interface InfraStackProps extends cdk.StackProps {
  github: GithubProps;
  appName: string;
  domainName: string;
  hasPrivateData: boolean;
  publicBucketName: string;
  privateBucketName?: string;
  loggingBucketName: string;
  deploymentType: DeploymentType;
  publicWebsitePath: string;
  privateWebsitePath?: string;
  generateWildcardCertificate: boolean;
}

export class InfraStack extends cdk.Stack {
  public readonly domain: DomainStack;
  public readonly storage: WebsiteBackendStack;
  public readonly deployment: SiteDeploymentStack;

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // NOTE: Each of the stacks created here have to have `env: props.env` set
    //       in their `props` definition to prevent CDK from thinking an
    //       improper cross-stack reference exists (passing `this.domain` to
    //       the new `SiteDeploymentStack`.

    this.domain = new DomainStack(this, "DomainStack", {
      domainName: props.domainName,
      generateWildcardCertificate: props.generateWildcardCertificate,
      env: props.env
    })

    this.deployment = new SiteDeploymentStack(this, "InfrastructureDeployment", {
      domain: this.domain,
      appName: props.appName,
      publicBucketName: props.publicBucketName,
      publicBucketDataPath: props.publicWebsitePath,
      privateBucketName: props.privateBucketName,
      privateBucketDataPath: props.privateWebsitePath,
      loggingBucketName: props.loggingBucketName,
      deploymentType: props.deploymentType,
      env: props.env,
    });

    this.storage = this.deployment.storage;
  }
}
