#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from "fs";
import * as path from "path";
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { DeploymentType } from "../lib/utils/deployment-type";
import { GithubProps } from "../lib/utils/github-props";
import { canonicalizeS3BucketName } from "../lib/utils/canonicalize-s3-bucket-name";

const app = new cdk.App();

const domainName = app.node.tryGetContext("domainName");
const appName = app.node.tryGetContext("appName") || domainName;
const deploymentType = process.env.CDK_STAGE as DeploymentType || DeploymentType.PROD;
const github: GithubProps = {
  githubOwner: app.node.tryGetContext("githubOwner"),
  githubRepo: app.node.tryGetContext("githubRepo"),
  githubBranch: app.node.tryGetContext("githubBranch")
}
let publicBucketName = app.node.tryGetContext("publicBucketName") || `${appName}-public`;
let privateBucketName = app.node.tryGetContext("privateBucketName") || `${appName}-private`;
let loggingBucketName = app.node.tryGetContext("loggingBucketName") || `${appName}-logging`;
const publicWebsitePath = app.node.tryGetContext("publicWebsitePath");
const privateWebsitePath = app.node.tryGetContext("privateWebsitePath");
const hasPrivateData: boolean = app.node.tryGetContext("hasPrivateData") || !!privateWebsitePath
const generateWildcardCertificate: boolean = app.node.tryGetContext("generateWildcardCertificate") || false;

publicBucketName = canonicalizeS3BucketName(publicBucketName);
privateBucketName = canonicalizeS3BucketName(privateBucketName);
loggingBucketName = canonicalizeS3BucketName(loggingBucketName);

const globalEnv = {
  appName: appName,
  domainName: domainName,
  hasPrivateData: hasPrivateData,
  publicBucketName: publicBucketName,
  privateBucketName: privateBucketName,
  loggingBucketName: loggingBucketName,
  deploymentType: deploymentType,
  publicBucketDataPath: publicWebsitePath,
  privateBucketDataPath: privateWebsitePath,
  generateWildcardCertificate: generateWildcardCertificate
}
const envUS = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};
const tagName = `${github.githubRepo}:${github.githubBranch}`

// Error checking
if (!domainName) {
  throw new Error(`"domainName" must be defined in context section of cdk.json.`);
}

if (!github.githubRepo || !github.githubBranch) {
  throw new Error(`"githubRepo and githubBranch must be defined in context section of cdk.json.`);
}

if (!publicWebsitePath) {
  throw new Error(`"publicWebsitePath" must be defined in context section of cdk.json.`)
}

let pathsToCheck = [publicWebsitePath]
if (privateWebsitePath) {
  pathsToCheck.push(privateWebsitePath)
}

for (const pathCheck of pathsToCheck) {
  fs.stat(pathCheck, (err, stats) => {
    if (!stats.isDirectory()) {
      throw new Error(`"${path.resolve(pathCheck)}" is not a directory that exists.`)
    }
  })
}

// Create the stack
new InfraStack(app, appName, {
  github, ...globalEnv, env: envUS
});

// Add project: `githubRepo:githubBranch` tag to everything possible to make
// finding things created by this app easier.
cdk.Tags.of(app).add("project", tagName);

