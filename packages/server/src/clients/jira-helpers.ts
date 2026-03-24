export const buildBugDescription = (params: {
  testName: string;
  polarionId?: string;
  polarionUrl?: string;
  launchName: string;
  cnvVersion?: string;
  ocpVersion?: string;
  clusterName?: string;
  errorMessage?: string;
  rpLaunchUrl: string;
  rpItemUrl: string;
}): string => {
  const lines = [`h2. Automated Test Failure`, ``, `*Test:* ${params.testName}`];

  if (params.polarionId) {
    const polarionLink = params.polarionUrl
      ? `[${params.polarionId}|${params.polarionUrl}${params.polarionId}]`
      : params.polarionId;
    lines.push(`*Polarion ID:* ${polarionLink}`);
  }
  lines.push(`*Launch:* ${params.launchName}`);
  if (params.cnvVersion) {
    lines.push(`*CNV Version:* ${params.cnvVersion}`);
  }
  if (params.ocpVersion) {
    lines.push(`*OCP Version:* ${params.ocpVersion}`);
  }
  if (params.clusterName) {
    lines.push(`*Cluster:* ${params.clusterName}`);
  }
  lines.push('');
  lines.push(`*ReportPortal:* [Launch|${params.rpLaunchUrl}] | [Test Item|${params.rpItemUrl}]`);

  if (params.errorMessage) {
    lines.push('');
    lines.push(`h3. Error`);
    lines.push(`{code}`);
    lines.push(params.errorMessage.substring(0, 3000));
    lines.push(`{code}`);
  }

  return lines.join('\n');
};
