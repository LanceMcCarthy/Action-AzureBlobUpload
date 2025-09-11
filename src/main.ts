import * as core from '@actions/core';
import {AuthPayload, UploadToAzure} from './methods-azure';

async function run(): Promise<void> {
  const containerName = core.getInput('container_name');
  const sourceFolder = core.getInput('source_folder');
  const destinationFolder = core.getInput('destination_folder');
  const cleanDestinationPath = core.getInput('clean_destination_folder').toLowerCase() === 'true';
  const failIfSourceEmpty = core.getInput('fail_if_source_empty').toLowerCase() === 'true';
  const isRecursive = core.getInput('is_recursive').toLowerCase() === 'true';
  const deleteIfExists = core.getInput('delete_if_exists').toLowerCase() === 'false';

  // AuthType 1 - If using ConnectionString, this value is required
  // Note if a value is present, we automatically switch into AuthType 1 (see methods-azure.ts Line 59)
  const connectionString = core.getInput('connection_string');

  // AuthType 2 - If using Service Principal, these values are required
  const tenantId = core.getInput('tenant_id');
  const clientId = core.getInput('client_id');
  const clientSecret = core.getInput('client_secret');
  const storageAccount = core.getInput('storage_account');

  // For debugging purposes only
  // When forking this repo, be careful to not log secrets actual values (Github secrets should be masked, but be safe by default).
  // core.debug('Parameters received:');
  // core.debug(`container_name: ${containerName ? '***' : '<not provided>'}`);
  // core.debug(`source_folder: ${sourceFolder ? '***' : '<not provided>'}`);
  // core.debug(`destination_folder: ${destinationFolder ? '***' : '<not provided>'}`);
  // core.debug(`clean_destination_folder: ${cleanDestinationPath ? '***' : '<not provided>'}`);
  // core.debug(`fail_if_source_empty: ${failIfSourceEmpty ? '***' : '<not provided>'}`);
  // core.debug(`is_recursive: ${isRecursive ? '***' : '<not provided>'}`);
  // core.debug(`delete_if_exists: ${deleteIfExists ? '***' : '<not provided>'}`);
  // core.debug(`connection_string: ${connectionString ? '***' : '<not provided>'}`);
  // core.debug(`tenant_id: ${tenantId ? '***' : '<not provided>'}`);
  // core.debug(`client_id: ${clientId ? '***' : '<not provided>'}`);
  // core.debug(`client_secret: ${clientSecret ? '***' : '<not provided>'}`);
  // core.debug(`storage_account: ${storageAccount ? '***' : '<not provided>'}`);

  let authPayload: AuthPayload;
  if (connectionString) {
    authPayload = {type: 'connection_string', connectionString};
  } else {
    authPayload = {type: 'service_principal', tenantId, clientId, clientSecret, storageAccount};
  }

  // invoke this Action's main entry method
  await UploadToAzure({
    authPayload,
    containerName,
    sourceFolder,
    destinationFolder,
    cleanDestinationPath,
    failIfSourceEmpty,
    isRecursive,
    deleteIfExists
  }).catch(e => {
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
