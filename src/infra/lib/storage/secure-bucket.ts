import { Construct } from "constructs";
import {
  aws_s3 as s3,
  aws_kms as kms,
  aws_iam as iam,
} from "aws-cdk-lib";

export class SecureBucketProps implements s3.BucketProps {
  /**
   * An interface that forces bucket properties to be secure.  The
   * s3.BucketEncryption is not allowed to be Unencrypted.
   * Allow S3_MANAGED because it's cheaper than having to make calls
   * to KMS, and this project doesn't need it.  Enable the bucket key
   * for the same reason (uses one key for everything in the bucket).
   */
  encryption?: s3.BucketEncryption.S3_MANAGED;
  encryptionKey?: kms.IKey;
  requireSecureTransport?: true;
  accessControl?: s3.BucketAccessControl.PRIVATE;
  websiteRedirect?: SecureRedirectTarget;
  blockPublicAccess?: SecureBlockPublicAccess;
  publicReadAccess?: false;
  bucketKeyEnabled?: true; // Fewer KMS calls - less costly.
}

/**
 * Class that prevents you from creating a bucket with public
 * access to anything.
 */
export class SecureBlockPublicAccess extends s3.BlockPublicAccess {
  public blockPublicAcls!: true;
  public blockPublicPolicy!: true;
  public ignorePublicAcls!: true;
  public restrictPublicBuckets!: true;

  /**
   * Block all public access to the S3 bucket.  Information will be delivered
   * via CloudFront.  This is no different from s3.BlockPublicAccess.BLOCK_ALL.
   */
  public static readonly BLOCK_ALL = new SecureBlockPublicAccess({
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  });

  /**
   * Subset just for ACLs.  Same as s3.BlockPublicAccess.BLOCK_ACLS.
   */
  public static readonly BLOCK_ACLS = new s3.BlockPublicAccess({
    blockPublicAcls: true,
    blockPublicPolicy: true,
  });

  /**
   * Constructor.  Sets any value in s3.BlockPublicAccessOptions to true.
   */
  constructor(options: { [P in keyof s3.BlockPublicAccessOptions]-?: true}) {
    super(options);
  }
}

/**
 * A secure redirect target that only allows HTTPS redirecting.
 */
export interface SecureRedirectTarget extends s3.RedirectTarget {
  protocol: s3.RedirectProtocol.HTTPS
}


/**
 * Interface for the secure bucket.
 */
interface ISecureBucket extends s3.IBucket {
  policy?: s3.BucketPolicy;

  addToResourcePolicy(permission: iam.PolicyStatement): iam.AddToResourcePolicyResult;
  grantRead(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant;
  grantWrite(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant;
  grantPut(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant;
  grantReadWrite(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant;
}
export type SecureIBucket = ISecureBucket;

/**
 * The Secure Bucket is just like s3.Bucket, but it enforces secure settings
 * by default.
 */
export class SecureBucket extends s3.Bucket implements SecureIBucket {
  public policy?: s3.BucketPolicy;

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id, props);
  }

  // We aren't doing anything but calling s3.Bucket for these.
  public addToResourcePolicy(permission: iam.PolicyStatement): iam.AddToResourcePolicyResult {
    return super.addToResourcePolicy(permission);
  }

  public grantRead(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant {
    return super.grantRead(identity, objectsKeyPattern);
  }

  public grantWrite(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant {
    return super.grantWrite(identity, objectsKeyPattern);
  }

  public grantPut(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant {
    return super.grantPut(identity, objectsKeyPattern);
  }

  public grantReadWrite(identity: iam.IGrantable, objectsKeyPattern?: any): iam.Grant {
    return super.grantReadWrite(identity, objectsKeyPattern);
  }
}
