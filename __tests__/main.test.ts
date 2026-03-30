import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';

jest.mock('../src/methods-azure', () => ({
  UploadToAzure: jest.fn()
}));

const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));

async function runMainWithInputs(inputs: Record<string, string>, uploadError?: Error) {
  jest.resetModules();

  const core = await import('@actions/core');
  const methodsAzure = await import('../src/methods-azure');

  const getInputMock = core.getInput as unknown as jest.MockedFunction<(...args: unknown[]) => unknown>;
  const uploadToAzureMock = methodsAzure.UploadToAzure as unknown as jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

  getInputMock.mockImplementation((...args: unknown[]) => {
    const name = String(args[0]);
    return inputs[name] ?? '';
  });

  if (uploadError) {
    uploadToAzureMock.mockRejectedValueOnce(uploadError);
  } else {
    uploadToAzureMock.mockImplementation(async () => undefined);
  }

  await import('../src/main');
  await flushPromises();

  return {core, methodsAzure};
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('main.ts', () => {
  it('fails early when auth_type is unsupported', async () => {
    const {core, methodsAzure} = await runMainWithInputs({
      auth_type: 'invalid_type',
      container_name: 'container',
      source_folder: 'src',
      destination_folder: '',
      clean_destination_folder: 'false',
      fail_if_source_empty: 'false',
      is_recursive: 'true',
      delete_if_exists: 'false'
    });

    expect(methodsAzure.UploadToAzure).not.toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith("Unsupported auth type: invalid_type. Expected 'connection_string' or 'service_principal'.");
  });

  it('uses connection string mode when auth_type is connection_string', async () => {
    const {core, methodsAzure} = await runMainWithInputs({
      auth_type: 'connection_string',
      connection_string: 'UseDevelopmentStorage=true',
      tenant_id: 'tenant-id',
      client_id: 'client-id',
      client_secret: 'client-secret',
      storage_account: 'storageaccount',
      container_name: 'container',
      source_folder: 'src',
      destination_folder: '',
      clean_destination_folder: 'false',
      fail_if_source_empty: 'false',
      is_recursive: 'true',
      delete_if_exists: 'false'
    });

    expect(methodsAzure.UploadToAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        authPayload: {
          type: 'connection_string',
          connectionString: 'UseDevelopmentStorage=true'
        }
      })
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('uses service principal mode when auth_type is service_principal', async () => {
    const {core, methodsAzure} = await runMainWithInputs({
      auth_type: 'service_principal',
      connection_string: 'UseDevelopmentStorage=true',
      tenant_id: 'tenant-id',
      client_id: 'client-id',
      client_secret: 'client-secret',
      storage_account: 'storageaccount',
      container_name: 'container',
      source_folder: 'src',
      destination_folder: '',
      clean_destination_folder: 'false',
      fail_if_source_empty: 'false',
      is_recursive: 'true',
      delete_if_exists: 'false'
    });

    expect(methodsAzure.UploadToAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        authPayload: {
          type: 'service_principal',
          tenantId: 'tenant-id',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          storageAccount: 'storageaccount'
        }
      })
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('infers connection string mode when auth_type is omitted and connection_string is present', async () => {
    const {core, methodsAzure} = await runMainWithInputs({
      connection_string: 'UseDevelopmentStorage=true',
      tenant_id: 'tenant-id',
      client_id: 'client-id',
      client_secret: 'client-secret',
      storage_account: 'storageaccount',
      container_name: 'container',
      source_folder: 'src',
      destination_folder: '',
      clean_destination_folder: 'false',
      fail_if_source_empty: 'false',
      is_recursive: 'true',
      delete_if_exists: 'false'
    });

    expect(methodsAzure.UploadToAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        authPayload: {
          type: 'connection_string',
          connectionString: 'UseDevelopmentStorage=true'
        }
      })
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('normalizes backslashes in path inputs before calling UploadToAzure', async () => {
    const {core, methodsAzure} = await runMainWithInputs({
      auth_type: 'connection_string',
      connection_string: 'UseDevelopmentStorage=true',
      container_name: 'container',
      source_folder: '.\\artifacts\\output\\',
      destination_folder: 'uploads\\subfolder\\',
      clean_destination_folder: 'false',
      fail_if_source_empty: 'false',
      is_recursive: 'true',
      delete_if_exists: 'false'
    });

    expect(methodsAzure.UploadToAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFolder: 'artifacts/output',
        destinationFolder: 'uploads/subfolder'
      })
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });
  it('preserves absolute source_folder path (leading slash) on Linux runners', async () => {
    const {core, methodsAzure} = await runMainWithInputs({
      auth_type: 'connection_string',
      connection_string: 'UseDevelopmentStorage=true',
      container_name: 'container',
      source_folder: '/home/runner/work/_temp/janitor-data',
      destination_folder: 'janitor-data',
      clean_destination_folder: 'false',
      fail_if_source_empty: 'false',
      is_recursive: 'false',
      delete_if_exists: 'true'
    });

    expect(methodsAzure.UploadToAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFolder: '/home/runner/work/_temp/janitor-data',
        destinationFolder: 'janitor-data'
      })
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });
  it('fails the action when UploadToAzure rejects', async () => {
    const uploadError = new Error('upload failed from main');
    const {core} = await runMainWithInputs(
      {
        auth_type: 'connection_string',
        connection_string: 'UseDevelopmentStorage=true',
        container_name: 'container',
        source_folder: 'src',
        destination_folder: '',
        clean_destination_folder: 'false',
        fail_if_source_empty: 'false',
        is_recursive: 'true',
        delete_if_exists: 'false'
      },
      uploadError
    );

    expect(core.error).toHaveBeenCalledWith('upload failed from main');
    expect(core.setFailed).toHaveBeenCalledWith('upload failed from main');
  });
});
