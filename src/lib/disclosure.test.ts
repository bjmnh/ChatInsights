import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from './insights/csp';
import { ACCOUNT_KEY_HELP, ARCHIVE_ACK, ARCHIVE_NOTICE, CONSENT_POINTS } from './insights/copy';

const files = [
  'src/pages/HomePage.tsx',
  'src/pages/ReadPage.tsx',
  'src/pages/PrivacyPage.tsx',
  'src/pages/TermsPage.tsx',
  'src/pages/DashboardPage.tsx',
  'src/components/insights/SetupPanel.tsx',
  'src/lib/insights/copy.ts',
  'src/lib/insights/hydratePremium.ts',
  'README.md',
];

const forbidden = [
  'The file is not uploaded',
  'We do not upload the raw export',
  'Nothing is uploaded',
  'The raw export stays in the browser',
  'The raw export is not uploaded',
  'not the raw export',
  'The key is never sent to our servers for storage',
  'will not send it to its servers for storage',
  'does not upload it',
];

describe('storage disclosure', () => {
  it('states that uploads are stored and that account keys are optional', () => {
    expect(ARCHIVE_NOTICE).toMatch(/stored on Chat Insights’ servers \(Supabase\) for security review/);
    expect(ARCHIVE_ACK).toMatch(/I understand a copy of this file will be stored/);
    expect(ACCOUNT_KEY_HELP).toMatch(/stored encrypted on the server and tied to your account/);
    expect(ACCOUNT_KEY_HELP).toMatch(/does not delete/);
    expect(CONSENT_POINTS.join('\n')).toMatch(/only if I am signed in and I check Save key to my account/);
    expect(CONTENT_SECURITY_POLICY).toContain('https://*.supabase.co');
  });

  it('removes the old on-device-only claims from the pages that used them', () => {
    const combined = files.map((file) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')).join('\n');
    for (const phrase of forbidden) expect(combined).not.toContain(phrase);
    expect(combined).toContain('bhanson8@asu.edu');
    expect(combined).toContain('personal hobby project');
    expect(combined).not.toMatch(/retained for \d+ (days|months|years)/i);
    expect(combined).not.toMatch(/deleted after \d+/i);
  });
});
