import axios from 'axios';
import { logger } from '../utils/logger.js';

const GITHUB_API_URL = 'https://api.github.com';
const REQUIRED_ORGANIZATIONS = (process.env['REQUIRED_ORGANIZATIONS'] || 'pagopa').split(',').map(org => org.trim());

export async function verifyGithubUser(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/orgs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    logger.info('GitHub API response:', response.data);

    const organizations = response.data;
    const isMember = organizations.some((org: any) => REQUIRED_ORGANIZATIONS.includes(org.login));

    if (isMember) {
      logger.info(`User is a member of one of the required organizations: ${REQUIRED_ORGANIZATIONS.join(', ')}`);
    } else {
      logger.warn(`User is not a member of any of the required organizations: ${REQUIRED_ORGANIZATIONS.join(', ')}`);
    }

    return isMember;
  } catch (error) {
    logger.error(error, 'Error verifying GitHub organization membership:');
    return false;
  }
}
