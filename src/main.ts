import * as core from '@actions/core';
import {UploadToAzure} from './methods-azure';

async function run(): Promise<void> {
  // Parameters from the developer in their GitHub Actions workflow
  const cnnStr = core.getInput('connection_string');
  const contName = core.getInput('container_name');
  const srcPath = core.getInput('source_folder');
  const dstPath = core.getInput('destination_folder');
  const cleanDst = core.getInput('clean_destination_folder').toLowerCase() === 'true';
  const fail = core.getInput('fail_if_source_empty').toLowerCase() === 'true';
  const isRecursive = core.getInput('is_recursive').toLowerCase() === 'true';

  // invoke this Action's main entry method
  await UploadToAzure(cnnStr, contName, srcPath, dstPath, cleanDst, fail, isRecursive).catch(e => {
    core.debug(e.stack);
    core.error(e.message);
    core.setFailed(e.message);
  });
}

// Showtime!
run().catch(e => {
  core.debug(e.stack);
  core.error(e.message);
  core.setFailed(e.message);
});
