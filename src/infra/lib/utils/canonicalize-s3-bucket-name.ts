export function canonicalizeS3BucketName(bucketName: string): string {
  let newBucketName = bucketName.toLowerCase();
  if (newBucketName.endsWith("/")) {
    newBucketName = newBucketName.slice(0, -1)
  }

  newBucketName = newBucketName
      .replaceAll("/", "-")
      .replace(/[^a-z0-9.-]/g, "")

  return newBucketName;
}