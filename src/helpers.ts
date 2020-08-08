import * as mime from 'mime-types';
import { ContainerClient } from '@azure/storage-blob';

export const uploadFileFromPathWithContentType = async (client: ContainerClient, src: string, dst: string) => {
    const mt = mime.lookup(src);
    const blobHTTPHeaders = mt ? { blobContentType: mt } : {};
    await client.getBlockBlobClient(dst).uploadFile(src, { blobHTTPHeaders });
};

export const uploadFileFromPath = async (client: ContainerClient, src: string, dst: string) => {
    await client.getBlockBlobClient(dst).uploadFile(src);
};

// Options to consider in future version https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/storage/storage-blob/samples/typescript/src/iterators-blobs-hierarchy.ts
// export async function findAllFiles(dir: string) {
//     async function _traverse(dir: string, fileList: string[]) {
//       const files = await fs.readdir(dir);
//       for (const file of files) {
//         const path = join(dir, file);
//         const stat = await fs.lstat(path);
//         if (stat.isDirectory()) {
//           fileList = await _traverse(path, fileList);
//         } else {
//           fileList.push(path);
//         }
//       }
//       return fileList;
//     }
  
//     return await _traverse(dir, []);
// };
