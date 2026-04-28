export const environment = {
  production: false,
  aws: {
    region: 'YOUR_AWS_REGION', // e.g., 'ap-south-2'
    userPoolId: 'YOUR_USER_POOL_ID',
    userPoolWebClientId: 'YOUR_APP_CLIENT_ID',
    appSyncGraphqlEndpoint: 'YOUR_APPSYNC_ENDPOINT_URL',
    s3BucketName: 'YOUR_S3_IMAGE_BUCKET_NAME',
    apiKey: 'YOUR_APPSYNC_API_KEY' // Only needed for public access
  }
};
