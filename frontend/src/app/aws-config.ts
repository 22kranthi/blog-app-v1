import { environment } from '../environments/environment';

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: environment.aws.userPoolId,
      userPoolClientId: environment.aws.userPoolWebClientId,
      loginWith: {
        email: true
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: environment.aws.appSyncGraphqlEndpoint,
      region: environment.aws.region,
      defaultAuthMode: 'userPool' as const
    }
  }
};
