import { StackProps } from 'aws-cdk-lib';

export interface GithubProps extends StackProps {
  githubOwner?: string;
  githubRepo: string;
  githubBranch: string;
}