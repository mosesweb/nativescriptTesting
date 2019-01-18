import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { User } from '../model/user.model';
const appSettings = require("application-settings");
import {
  request,
  getFile,
  getImage,
  getJSON,
  getString,
  HttpRequestOptions,
  HttpResponse
} from 'tns-core-modules/http';

import { searchResponse, DataEntity, JapaneseEntity } from '../model/searchResponse.model';
import { searchResponseProxy } from '../model/searchResponseProxy';
import { searchResponseItemClient } from '../model/searchResponseItemClient';
import { VocabList } from '../model/vocabList.model';
import { Guid } from '../model/Guid';
import { map, filter } from 'rxjs/operators';
import { ClientWord } from '../model/ClientWord.model';
const firebase = require("nativescript-plugin-firebase");
const http = require('http');
const firebase2 = require("nativescript-plugin-firebase/app");


@Injectable()
export class UserService {
  public loggedIn: Boolean = false;
  public UserFromService : User
  getUser(): Observable<User> {
   
    const userdata = from(firebase.getCurrentUser());
    const example = userdata.pipe(map((val: User) => val));
    return example;
  }
  public globalListChoice: string;

  insertIntoList = (listId: string, word: string) : void =>
  {
    
    const vocablistCollection = firebase2.firestore().collection("vocablists");
    const query = vocablistCollection
    .where("listId", "==", listId);
    console.log('setted? ' + listId);
    
    let wordList :  Array<ClientWord> = [];
    wordList.push(<ClientWord>{japanese_reading: word});

    query
    .get()
    .then(querySnapshot => {
      querySnapshot.forEach(doc => {
        
        let wordList :  Array<ClientWord> = []; 

        if(doc.data().words !== undefined) 
        wordList = doc.data().words.map(w => <ClientWord> {japanese_reading: w.japanese_reading});

        wordList.push(<ClientWord>{japanese_reading: word});
        
        vocablistCollection.doc(doc.id).set(
          {
            title: doc.data().title,
            listId: doc.data().listId,
            uid: doc.data().uid,
            words: wordList
          });
      });

    });
  }
  setlistChoice = (listchoice : string) : void =>
  {
    appSettings.setString("listChoice", listchoice);
    const listChoice = appSettings.getString("listChoice", "");
    this.globalListChoice = listChoice;
  }
  setlistChoiceWithListId = (listchoice : VocabList) : void =>
  {
    if(listchoice.title !== undefined)
    appSettings.setString("listChoice", listchoice.title);

    if(listchoice.listid !== undefined && listchoice.listid != null)
    appSettings.setString("listChoiceId", listchoice.listid);

    const listChoice = appSettings.getString("listChoice", "");
    this.globalListChoice = listChoice;
  }
  getlistChoice = () : string =>
  {
    return appSettings.getString("listChoice", "");
  }
  getlistChoiceId = () : string =>
  {
    return appSettings.getString("listChoiceId", "");
  } 
    vocablists: Array<VocabList>;

    addVocabList = (vocablist: VocabList, uid: string): any => {
      const listsCollection = firebase2.firestore().collection("vocablists");
      console.log(Guid.newGuid);
      listsCollection.add({
        title: vocablist.title, 
        listId: Guid.newGuid(), 
        uid: uid });
    }
    clientItemsList: Array<searchResponseItemClient>

  constructor()
  {
    // Subscribe to begin listening for async result
    firebase.init({
      onAuthStateChanged: (data)  => { // optional but useful to immediately re-logon the user when he re-visits your app
        console.log(data.loggedIn ? "Logged in to firebase" : "Logged out from firebase");
        if (data.loggedIn) {
          this.UserFromService = data.user;
          console.log(this.UserFromService.name + ' nice');
        }
        else
        {
          this.UserFromService = null;
        }
      }
    });
    
    this.clientItemsList = [];
    this.vocablists = [];
  }
  getAllUsers = (): Observable<Array<User>> => {
    return;
  };
  getUserName = () : Observable<string> => 
  {
    let auser;
    return;
  }
  getUserLists = (user: User, callback: (n: Observable<Array<VocabList>>) => any) : void =>
    {
      
        const vocablistCollection = firebase2.firestore().collection("vocablists");
            
        //"Gimme all lists from this user
        const query = vocablistCollection
        .where("uid", "==", user.uid);

        query
        .get()
        .then(querySnapshot => {


        querySnapshot.forEach(doc => {
            this.vocablists.push(
                new VocabList(doc.data().title, "", doc.data().listId)
            );
        });
        callback(of(this.vocablists));
        });
    }
  search = (searchtag : string, callback: (n: Observable<Array<DataEntity>>) => any) : void => 
  {
    this.clientItemsList = [];
    if(searchtag != "")
    {
      getJSON("https://jisho.org/api/v1/search/words?keyword=" + searchtag).then((r: any) => 
      {
        
        let responseItems = searchResponseProxy.Create(r).data;
        console.log(responseItems.length);
        responseItems.forEach(function (searchResponse) {
          searchResponse.japanese.forEach(function(searchResponseJapanese) {
            console.log(searchResponseJapanese.word);
            console.log(searchResponseJapanese.reading);
          });
      });
        
      responseItems.forEach((value: DataEntity) =>
      {
        let clientItem: searchResponseItemClient;
        let japanese_reading = "";
        let japanese_word = "";
        clientItem = value;
        
        clientItem.MainJapaneseWord = value.japanese[0].word;
        clientItem.MainJapaneseReading = value.japanese[0].reading;

        value.japanese.forEach((japaneseEntity: JapaneseEntity) =>
        { 
          if(japaneseEntity.reading !== undefined && japaneseEntity.reading != null && japaneseEntity.reading != "")
          japanese_reading += japaneseEntity.reading + ', ';

          if(japaneseEntity.word !== undefined && japaneseEntity.word != null && japaneseEntity.word != "")
          japanese_word += japaneseEntity.word + ', ';
          
        })
        clientItem.AllJapaneseReading = japanese_reading;
        clientItem.AllJapaneseWord = japanese_word;

        this.clientItemsList.push(clientItem);
      })

      callback(of(this.clientItemsList));


      }, (e) => {
        console.log(e)
      });
    }
    return ;;
  }
}
