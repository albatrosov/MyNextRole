import { defineConfig } from 'wxt';

// Public key for the extension (derived from key.pem). Pins the unpacked
// extension ID so OAuth client in GCP keeps matching across reloads.
// Chrome Web Store REJECTS manifests containing `key`, so it is omitted
// from store builds — set CWS_BUILD=1 when zipping for upload.
const EXTENSION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsuSKXCRktc6vIIT+qcT+mZjD+e6Mu90TGn5DZnWpfsyeaUXAOjq6sVZaxX6AHpVwD8um4BpzV3YFWoUUkbkpgzBl39FzMeSZwtup8dLClpHGukAXJpdIycUFsoVcpVccbRK9Vuc+xiy+02/R1zic5JC//DNBT04Vsh6LHCq3gzceuEHCXI/Azd5KD/2HdD1U6BeDhS4pJQMQ984bhr2zc9lveeLKBHe3DmqM4NiDwIX7eCMnfACJ0Hpbr4EIh0DC1cgXA1DVDFnZpVBDnNl9IfC4SRPd4V9zTrj9VoxZ/S+w2UYR11wfGXvfskitIk6Ty/0t+Qesydq157AixT9WyQIDAQAB';

const IS_STORE_BUILD = process.env.CWS_BUILD === '1';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'My Next Role',
    description: 'Відстежуйте відгуки на вакансії та статуси відповідей',
    ...(IS_STORE_BUILD ? {} : { key: EXTENSION_KEY }),
    permissions: ['identity', 'storage', 'alarms', 'notifications'],
    host_permissions: [
      'https://www.googleapis.com/*',
      'https://gmail.googleapis.com/*',
    ],
    oauth2: {
      client_id: '590689178853-ca8qsnqloul3vdhur3kd3vqnkeqtmuc0.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    },
  },
});
