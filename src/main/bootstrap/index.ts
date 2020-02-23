import { app, ipcMain } from "electron";
import path from "path";
import uuid from "uuid/v1";
import { Ffile } from "../../MainWindow/lib/vdir";
import services from "../services";
import { CallbackFunc } from "../services/types";
import { TaskRunner } from "../helper/tasks";
import { OssType, TaskType, TransferStatus } from "../types";
import transfers from "../store/transfers";
import events from "../helper/events";
import { initConfig } from "./config";
import { initApp } from "./apps";
import { getApps } from "../store/apps";
import { fattenFileList } from "../helper/utils";
import { uploadFile } from "./handler";

const taskRunner = new TaskRunner(5, true);

// todo: transfers 本地文件 加密
export default async function index() {
  // 获取当前的app
  const config = await initConfig();
  const currentAppId = config.currentApp;
  if (!currentAppId) {
    console.log("还没有 app ！");
  } else {
    const a = await initApp(currentAppId);
  }

  const factory = services.create;
  const ak = "aKFa7HTRldSWSXpd3nUECT-M4lnGpTHVjKhHsWHD";
  const sk = "7MODMEi2H4yNnHmeeLUG8OReMtcDCpuXHTIUlYtL";
  const qiniu = factory(OssType.qiniu, ak, sk);

  events.on("done", (id: string) => {
    transfers.update({ id }, { $set: { status: TransferStatus.done } });
  });

  events.on("failed", (id: string) => {
    transfers.update({ id }, { $set: { status: TransferStatus.failed } });
  });

  ipcMain.on("get-buckets-request", async event => {
    const buckets = await qiniu.getBucketList();
    event.reply("get-buckets-response", buckets);
  });

  ipcMain.on("get-files-request", async (event, bucketName: string) => {
    qiniu.setBucket(bucketName);
    const files = await qiniu.getBucketFiles();
    event.reply("get-files-response", files);
  });

  ipcMain.on("req:file:download", async (event, bucketName, item: Ffile) => {
    const remotePath = item.webkitRelativePath;
    const downloadDir = app.getPath("downloads");
    const downloadPath = path.join(downloadDir, item.webkitRelativePath);
    const callback: CallbackFunc = (id, progress) => {
      console.log("id: ", id);
      console.log("progress: ", progress);
    };
    // fixme: _id
    const id = uuid();
    // todo：换成class
    const newDoc = {
      id,
      name: item.name,
      date: new Date().getTime(),
      type: TaskType.download,
      size: item.size,
      status: TransferStatus.default
    };
    // 存储下载信息
    transfers.insert(newDoc, (err, document) => {
      // 添加任务，自动执行
      taskRunner.addTask<any>({
        ...document,
        result: qiniu.downloadFile(id, remotePath, downloadPath, callback)
      });
    });
  });

  ipcMain.on(
    "req:file:upload",
    (event, remoteDir: string, filepath: string) => {
      const baseDir = path.dirname(filepath);
      const callback: CallbackFunc = (id, progress) => {
        console.log("id: ", id);
        console.log("progress: ", progress);
      };
      uploadFile(qiniu, remoteDir, baseDir, filepath, taskRunner, callback);
    }
  );

  ipcMain.on(
    "req:file:delete",
    async (event, bucketName: string, item: Ffile) => {
      const remotePath = item.webkitRelativePath;
      await qiniu.deleteFile(remotePath);
    }
  );

  ipcMain.on("transfers", event => {
    transfers.find({ status: TransferStatus.done }, (err, documents) => {
      if (err) throw new Error("查询出错");
      event.reply("transfers-reply", documents);
    });
  });

  ipcMain.on("transmitting", event => {
    transfers.find(
      { $not: { status: TransferStatus.done } },
      (err, documents) => {
        if (err) throw new Error("查询出错");
        event.reply("transmitting-reply", documents);
      }
    );
  });

  ipcMain.on("getApps", async event => {
    const apps = await getApps();
    event.reply("appsRep", apps);
  });

  ipcMain.on(
    "drop-files",
    async (event, remoteDir: string, fileList: string[]) => {
      const baseDir = path.dirname(fileList[0]);
      const list = fattenFileList(fileList);
      list.forEach(filepath => {
        const callback: CallbackFunc = (id, progress) => {
          console.log("id: ", id);
          console.log("progress: ", progress);
        };
        uploadFile(qiniu, remoteDir, baseDir, filepath, taskRunner, callback);
      });
    }
  );
}
