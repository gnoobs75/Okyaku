import { Amplify } from "aws-amplify";

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID || "",
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: "code" as const,
      userAttributes: {
        email: {
          required: true,
        },
      },
    },
  },
};

export function configureAmplify() {
  Amplify.configure(amplifyConfig);
}
