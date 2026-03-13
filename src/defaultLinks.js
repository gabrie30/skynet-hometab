/**
 * Default link configuration. Used as initial seed on first load
 * and as the baseline for "Update to New Default".
 *
 * Structure:
 *   columns: array of { id, heading, links: [{ name, url }] }
 *   navbar:  { left: { name, url }, right: { name, url } }
 *   dropdowns: array of { id, heading, urlTemplate, items: Array<{ value, label? }> }
 *     urlTemplate uses {part}, {part1}, {part2}, ...; value is comma-separated parts or a full URL (https://... uses value as link); label is optional
 *   titleImage: string (URL for the logo displayed below the navbar)
 */
export function getDefaultLinks() {
  return {
    titleImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Skynet_Terminator_logo.png/330px-Skynet_Terminator_logo.png',
    openLinksInNewTab: true,
    searchBookmarks: true,
    columns: [
      {
        id: 'cloud',
        heading: 'Cloud Platforms',
        links: [
          { name: 'AWS Console', url: 'https://console.aws.amazon.com/' },
          { name: 'GCP Console', url: 'https://console.cloud.google.com/' },
          { name: 'Azure Portal', url: 'https://portal.azure.com/' },
          { name: 'Terraform Cloud', url: 'https://app.terraform.io/' },
          { name: 'Cloudflare', url: 'https://dash.cloudflare.com/' },
          { name: 'DigitalOcean', url: 'https://cloud.digitalocean.com/' },
          { name: 'Vercel', url: 'https://vercel.com/dashboard' },
          { name: 'Netlify', url: 'https://app.netlify.com/' },
        ],
      },
      {
        id: 'devtools',
        heading: 'Developer Tools',
        links: [
          { name: 'GitHub', url: 'https://github.com/' },
          { name: 'GitLab', url: 'https://gitlab.com/' },
          { name: 'Stack Overflow', url: 'https://stackoverflow.com/' },
          { name: 'Docker Hub', url: 'https://hub.docker.com/' },
          { name: 'npm', url: 'https://www.npmjs.com/' },
          { name: 'PyPI', url: 'https://pypi.org/' },
          { name: 'Crates.io', url: 'https://crates.io/' },
          { name: 'GitHub Status', url: 'https://www.githubstatus.com/' },
        ],
      },
      {
        id: 'monitoring',
        heading: 'Monitoring & Ops',
        links: [
          { name: 'Grafana Cloud', url: 'https://grafana.com/' },
          { name: 'Datadog', url: 'https://app.datadoghq.com/' },
          { name: 'PagerDuty', url: 'https://app.pagerduty.com/' },
          { name: 'Sentry', url: 'https://sentry.io/' },
          { name: 'New Relic', url: 'https://one.newrelic.com/' },
          { name: 'Statuspage', url: 'https://www.atlassian.com/software/statuspage' },
          { name: 'Uptime Robot', url: 'https://uptimerobot.com/' },
        ],
      },
      {
        id: 'docs',
        heading: 'Documentation',
        links: [
          { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
          { name: 'DevDocs', url: 'https://devdocs.io/' },
          { name: 'React Docs', url: 'https://react.dev/' },
          { name: 'TypeScript Docs', url: 'https://www.typescriptlang.org/docs/' },
          { name: 'Node.js Docs', url: 'https://nodejs.org/en/docs/' },
          { name: 'Kubernetes Docs', url: 'https://kubernetes.io/docs/' },
          { name: 'Terraform Docs', url: 'https://developer.hashicorp.com/terraform/docs' },
          { name: 'Go Docs', url: 'https://go.dev/doc/' },
        ],
      },
      {
        id: 'productivity',
        heading: 'Productivity',
        links: [
          { name: 'Gmail', url: 'https://mail.google.com/' },
          { name: 'Google Calendar', url: 'https://calendar.google.com/' },
          { name: 'Google Drive', url: 'https://drive.google.com/' },
          { name: 'Notion', url: 'https://www.notion.so/' },
          { name: 'Slack', url: 'https://slack.com/' },
          { name: 'Linear', url: 'https://linear.app/' },
          { name: 'Figma', url: 'https://www.figma.com/' },
        ],
      },
      {
        id: 'utilities',
        heading: 'Utilities',
        links: [
          { name: 'regex101', url: 'https://regex101.com/' },
          { name: 'JSON Formatter', url: 'https://jsonformatter.org/' },
          { name: 'Excalidraw', url: 'https://excalidraw.com/' },
          { name: 'Can I Use', url: 'https://caniuse.com/' },
          { name: 'Hacker News', url: 'https://news.ycombinator.com/' },
          { name: 'Time Converter', url: 'https://www.worldtimebuddy.com/' },
          { name: 'localhost:3000', url: 'http://localhost:3000' },
        ],
      },
    ],
    navbar: {
      left: { name: 'GitHub', url: 'https://github.com/' },
      right: { name: 'Gmail', url: 'https://mail.google.com/' },
    },
    dropdowns: [
      {
        id: 'awsServices',
        heading: 'AWS Services',
        urlTemplate: 'https://console.aws.amazon.com/{part}/home',
        items: [
          'ec2',
          's3',
          'lambda',
          'rds',
          'ecs',
          'eks',
          'cloudformation',
          'iam',
          'cloudwatch',
          'route53',
          'dynamodb',
          'sqs',
          'sns',
          'elasticache',
        ],
      },
      {
        id: 'githubRepos',
        heading: 'Popular Repos',
        urlTemplate: 'https://github.com/{part}',
        items: [
          'facebook/react',
          'vercel/next.js',
          'microsoft/vscode',
          'golang/go',
          'kubernetes/kubernetes',
          'hashicorp/terraform',
          'grafana/grafana',
          'prometheus/prometheus',
          'docker/compose',
          'tailwindlabs/tailwindcss',
        ],
      },
    ],
    tabSets: [],
  };
}
