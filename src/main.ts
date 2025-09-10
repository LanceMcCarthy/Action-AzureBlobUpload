import * as core from '@actions/core';
import {AuthPayload, UploadToAzure} from './methods-azure';

async function run(): Promise<void> {
  // Parameters from the developer in their GitHub Actions workflow
  const connectionString = core.getInput('connection_string');
  const tenantId = core.getInput("tenant_id");
  const clientId = core.getInput("client_id");
  const clientSecret = core.getInput("client_secret");
  const storageAccount = core.getInput("storage_account");

  let authPayload: AuthPayload;
  if (connectionString) {
    authPayload = { type: "connection_string", connectionString };
  } else {
    authPayload = { type: "service_principal", tenantId, clientId, clientSecret, storageAccount };
  }

  const containerName = core.getInput('container_name');
  const sourceFolder = core.getInput('source_folder');
  const destinationFolder = core.getInput('destination_folder');
  const cleanDestinationPath = core.getInput('clean_destination_folder').toLowerCase() === 'true';
  const failIfSourceEmpty = core.getInput('fail_if_source_empty').toLowerCase() === 'true';
  const isRecursive = core.getInput('is_recursive').toLowerCase() === 'true';
  const deleteIfExists = core.getInput('delete_if_exists').toLowerCase() === 'false';

  // invoke this Action's main entry method
  await UploadToAzure({authPayload, containerName, sourceFolder, destinationFolder, cleanDestinationPath, failIfSourceEmpty, isRecursive, deleteIfExists}).catch(e => {
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
