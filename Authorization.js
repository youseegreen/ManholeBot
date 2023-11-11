// Twitter V1.1, OAuth1関係
const CONSUMER_KEY = PropertiesService.getScriptProperties().getProperty('CONSUMER_KEY');
const CONSUMER_SECRET = PropertiesService.getScriptProperties().getProperty('CONSUMER_SECRET');
const ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
const ACCESS_TOKEN_SECRET = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN_SECRET');

// Twitter V2, OAuth2関係
const CLIENT_ID = PropertiesService.getScriptProperties().getProperty('CLIENT_ID');
const CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('CLIENT_SECRET');

// 初回に実行
function InitOAuth1() {
  Logger.log(TwitterV1_1.oauth.showUrl());
}

// 初回に実行
function InitOAuth2() {
  Logger.log(TwitterV2.oauth.showUrl());
}

// Twitter V1.1, OAuth1関係
var TwitterV1_1 = {
  oauth: {
    name: "Twitter_V1.1",
    
    service: function() {
      return OAuth1.createService(this.name)
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
      .setConsumerKey(CONSUMER_KEY)
      .setConsumerSecret(CONSUMER_SECRET)
      .setCallbackFunction('TwitterV1_1.oauth.callback')
      .setAccessToken(ACCESS_TOKEN, ACCESS_TOKEN_SECRET)
      .setPropertyStore(PropertiesService.getUserProperties());
    },
    
    showUrl: function() {
      var service = this.service();
      if (!service.hasAccess()) 
        Logger.log(service.authorize());
      else 
        Logger.log("認証済みです");
    },
    
    callback: function (request) {
      var service = this.service();
      var isAuthorized = service.handleCallback(request);
      if (isAuthorized) 
        return HtmlService.createHtmlOutput("Success");
      else 
        return HtmlService.createHtmlOutput("Denied...");
    },
    
    clear: function(){
      OAuth1.createService(this.name)
      .setPropertyStore(PropertiesService.getUserProperties())
      .reset();
    }
  },
  
  init: function() {
    this.oauth.parent = this;
    return this;
  }
}.init();

// Twitter API V2, OAuth2関係
var TwitterV2 = {
  oauth: {
    name: "Twitter_V2",
    
    service: function() {
      this.parent.pkceChallengeVerifier();
      const userProps = PropertiesService.getUserProperties();
      return OAuth2.createService(this.name)
      .setAuthorizationBaseUrl('https://twitter.com/i/oauth2/authorize')
      .setTokenUrl('https://api.twitter.com/2/oauth2/token?code_verifier=' + userProps.getProperty("code_verifier"))
      .setClientId(CLIENT_ID)
      .setClientSecret(CLIENT_SECRET)
      .setCallbackFunction('TwitterV2.oauth.callback')
      .setPropertyStore(userProps)
      .setScope('users.read tweet.read tweet.write offline.access')
      .setParam('response_type', 'code')
      .setParam('code_challenge_method', 'S256')
      .setParam('code_challenge', userProps.getProperty("code_challenge"))
      .setTokenHeaders({
        'Authorization': 'Basic ' + Utilities.base64Encode(CLIENT_ID + ':' + CLIENT_SECRET),
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    },
    
    showUrl: function() {
      var service = this.service();
      if (!service.hasAccess()) 
        Logger.log(service.getAuthorizationUrl());
      else 
        Logger.log("認証済みです");
    },
    
    callback: function (request) {
      var service = this.service();
      var isAuthorized = service.handleCallback(request);
      if (isAuthorized) 
        return HtmlService.createHtmlOutput("Success");
      else 
        return HtmlService.createHtmlOutput("Denied...");
    },
    
    clear: function(){
      OAuth2.createService(this.name)
      .setPropertyStore(PropertiesService.getUserProperties())
      .reset();
    }
  }, 

  pkceChallengeVerifier: function() {
    var userProps = PropertiesService.getUserProperties();
    if (!userProps.getProperty("code_verifier")) {
      var verifier = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

      for (var i = 0; i < 128; i++) {
        verifier += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      var sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier)

      var challenge = Utilities.base64Encode(sha256Hash)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      userProps.setProperty("code_verifier", verifier)
      userProps.setProperty("code_challenge", challenge)
    }
  }, 

  tweet: function(payload) {
    var service = this.oauth.service();
    if (service.hasAccess()) {
      var url = 'https://api.twitter.com/2/tweets';
      var response = UrlFetchApp.fetch(url, {
        method: 'POST',
        'contentType': 'application/json',
        headers: {
          Authorization: 'Bearer ' + service.getAccessToken()
        },
        muteHttpExceptions: true,
        payload: JSON.stringify(payload)
      });
      var result = JSON.parse(response.getContentText());
      Logger.log(JSON.stringify(result, null, 2));
      return result["data"]["id"];
    } 
    else {
      var authorizationUrl = service.getAuthorizationUrl();
      Logger.log('Open the following URL and re-run the script: %s',authorizationUrl);
    }
  },

  init: function() {
    this.oauth.parent = this;
    return this;
  }
}.init();
