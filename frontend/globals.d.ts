// Tipos para Credential Management API
interface PasswordCredentialInit {
  id: string;
  password: string;
  name?: string;
  iconURL?: string;
}

interface PasswordCredential extends Credential {
  password: string;
}

declare var PasswordCredential: {
  prototype: PasswordCredential;
  new (init: PasswordCredentialInit): PasswordCredential;
};

interface CredentialRequestOptions {
  password?: boolean;
  federated?: FederatedCredentialRequestOptions;
  publicKey?: PublicKeyCredentialRequestOptions;
  signal?: AbortSignal;
  mediation?: CredentialMediationRequirement;
}

// Tipos para módulos CSS
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
