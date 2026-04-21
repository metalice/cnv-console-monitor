import { AppDataSource } from '../data-source';
import { JobInsightResult } from '../entities/JobInsightResult';

const getRepo = () => AppDataSource.getRepository(JobInsightResult);

export const saveJobInsight = async (data: {
  job_id: string;
  launch_rp_id: number;
  job_name: string;
  build_number: number;
  ai_provider: string;
  ai_model: string;
  triggered_by: string;
  status?: string;
}): Promise<JobInsightResult> => {
  const repo = getRepo();
  const entity = repo.create({ status: 'queued', ...data });
  return repo.save(entity);
};

export const getJobInsightByLaunchRpId = async (
  launchRpId: number,
): Promise<JobInsightResult | null> => {
  const repo = getRepo();
  return repo.findOne({
    order: { created_at: 'DESC' },
    where: { launch_rp_id: launchRpId },
  });
};

export const getJobInsightsByLaunchRpId = async (
  launchRpId: number,
): Promise<JobInsightResult[]> => {
  const repo = getRepo();
  return repo.find({
    order: { created_at: 'DESC' },
    where: { launch_rp_id: launchRpId },
  });
};

export const updateJobInsightStatus = async (
  jobId: string,
  status: string,
  result?: Record<string, unknown>,
): Promise<void> => {
  const repo = getRepo();
  const update: Record<string, unknown> = { status };
  if (result) {
    update.result = result;
  }
  if (status === 'completed' || status === 'failed') {
    update.completed_at = new Date();
  }
  await repo.update({ job_id: jobId }, update);
};

export const deleteJobInsight = async (jobId: string): Promise<void> => {
  const repo = getRepo();
  await repo.delete({ job_id: jobId });
};
