import {ipcMain} from 'electron';
import ObjectStorageServiceFactory from './services';
import {ObjectStorageServiceType} from './services/types';
// import Store from './store';
// import Service from './store/service';

const factory = ObjectStorageServiceFactory.create;
const ak = 'aKFa7HTRldSWSXpd3nUECT-M4lnGpTHVjKhHsWHD';
const sk = '7MODMEi2H4yNnHmeeLUG8OReMtcDCpuXHTIUlYtL';
const qiniu = factory(ObjectStorageServiceType.Qiniu, ak, sk);

// const store = new Store();
// const service = new Service(ak, sk);
// qiniu.getBucketList().then((buckets) => {
//   service.buckets = buckets;
//   store.add(service);
//   const bucket = buckets[0];
//   return qiniu.getBucketFiles(bucket);
// }).then((files) => {
//   console.log(files);
// });

ipcMain.on('get-buckets-request', (event) => {
  qiniu.getBucketList().then((buckets) => {
    event.reply('get-buckets-response', buckets);
  });
});

ipcMain.on('get-files-request', (event, name) => {
  qiniu.getBucketFiles(name).then((files) => {
    event.reply('get-files-response', files);
  });
});