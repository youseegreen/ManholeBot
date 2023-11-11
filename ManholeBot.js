// ManholeDatabaseと写真フォルダのID
const MANHOLE_DATABASE_ID = PropertiesService.getScriptProperties().getProperty('MANHOLE_DATABASE_ID');
const MANHOLE_PHOTO_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('MANHOLE_PHOTO_FOLDER_ID');

function manholePost() {
  const msh = SpreadsheetApp.openById(MANHOLE_DATABASE_ID); 
  const citySheet = msh.getSheetByName("city");
  const cityNum = citySheet.getLastRow() - 2;  // 1行目：HEADER, 最終行：番兵
  const botSheet = msh.getSheetByName("bot");
  const botNum = botSheet.getLastRow() - 2;  // 1行目：HEADER, 最終行：番兵

  if (cityNum != botNum) {
    // citySheetに新しい市町村が追加されたのでbotSheetにも追加する
    for (let i = 0; i < cityNum; i++) {
      let city = citySheet.getRange(i + 2, 3).getValue(); 
      let bot = botSheet.getRange(i + 2, 3).getValue();
      if (city == bot) continue;
      // 挿入する
      let newInfo = citySheet.getRange(i + 2, 1, 1, 3).getValues();
      newInfo[0].push("1999/01/01 00:00:00")
      botSheet.insertRowBefore(i + 2);
      botSheet.getRange(i + 2, 1, 1, 4).setValues(newInfo);
    }
  }

  // どの市町村を投稿するかを選択する
  let lastPostData = botSheet.getRange(`D2:D${cityNum + 1}`).getValues();  // 更新日時のデータを取得
  lastPostData = lastPostData.map((v, i) => [v[0], i]);  // 更新日時のデータに行番号を追加
  lastPostData.sort((a, b) => a[0] - b[0]);
  let random = Math.floor(Math.random() * 10);  // 投稿が古い10個の中からランダムに選ぶ  
  let postCityId = lastPostData[random][1];
  const postCityInfo = (botSheet.getRange(postCityId + 2, 1, 1, 3).getValues())[0];  // +2 : 1行目はじまり＋1行目はHeader

  // 投稿する情報を取得する
  const postCityName = postCityInfo[2];  // 投稿する市町村
  const postPhotoNames = [];             // 投稿する写真のファイル名
  const photoSheet = msh.getSheetByName("photo");
  const photoNum = photoSheet.getLastRow() - 2;  // 1行目：HEADER, 最終行：番兵
  for (let i = 0; i < photoNum; i++) {
    let photoInfo = (photoSheet.getRange(i + 2, 1, 1, 5).getValues())[0];
    if (photoInfo[0] == postCityInfo[0] && photoInfo[1] == postCityInfo[1] && photoInfo[2] == postCityInfo[2]) {
      postPhotoNames.push(photoInfo[4]);
    }
  }

  // 投稿する
  const photoFolder = DriveApp.getFolderById(MANHOLE_PHOTO_FOLDER_ID);
  let tweetId = -1;
  let tweetNum = Math.floor((postPhotoNames.length - 1) / 4) + 1;  // 1画像に4枚まで写真を添付可能

  for (let t = 0; t < tweetNum; t++){
    let tweetText = `【${postCityName}】`;
    let tweetMedias = [];
    
    for(let i = 0; i < 4; i++){
      if (i + t * 4 === postPhotoNames.length) break;
      let photoBlob = (photoFolder.getFilesByName(postPhotoNames[i + t * 4]).next()).getBlob();  //GoogleDriveから画像を取得
      let resp64 = Utilities.base64Encode(photoBlob.getBytes());
      let imgOption = { 'method':"POST", 'payload':{'media_data':resp64} };
      let imageUpload = JSON.parse(TwitterV1_1.oauth.service().fetch("https://upload.twitter.com/1.1/media/upload.json",imgOption)); 
      tweetMedias.push(imageUpload['media_id_string']);
    }
    if(t == 0)  // 1ツイート目は単にツイート
      tweetId = TwitterV2.tweet({'text':tweetText, 'media':{"media_ids":tweetMedias}});
    else  // 2ツイート目からは先ほどのツイートにリプライする
      tweetId = TwitterV2.tweet({'text':tweetText, 'reply':{'in_reply_to_tweet_id':tweetId}, 'media':{"media_ids":tweetMedias}});
  }  

  // 投稿日時を更新する
  botSheet.getRange(postCityId + 2, 4).setValue(new Date());
}
