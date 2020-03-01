'use strict';

const axios = require('axios');
const csv = require('csvtojson');
const Bottleneck = require('bottleneck')
const isEqual = require('lodash.isequal');

// set environment variables
require('dotenv').config();

//limiter throttles api requests to 4 per second max
const limiter = new Bottleneck({
	minTime:250,
	maxConcurrent:1
})

//input validation variables
const emailRE = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const userKeys = ['firstName','lastName','email','favoriteTomato','totalTomatoOrders','daysSinceLastOrder','zip','phoneNumber','age','streetAddress','city','state','customMessageOne','gender'];


//create each bulk update axios api request per the spec
const genBulkUpdate = async (users) => {
	const axiosConfig = {
		url:'https://api.iterable.com/api/users/bulkUpdate',
		method:'post',
		headers:{
			'Api-Key':process.env.API_KEY
		},
		data:{
			"users":users
		}
	}
	return axios(axiosConfig);
}
const throttledBulkUpdate = limiter.wrap(genBulkUpdate);

//execute bottleneck queue of axios post requests
const executeUserUpdateQueue = async (userBatches) => {
	const userBulkUpdateQueue = userBatches.map(batch=>{
		return throttledBulkUpdate(batch)
	})
	try{
		const results = await Promise.all(userBulkUpdateQueue)
		if(results){
			return results
		} else {
			throw new Error('No Results');
		}
	} catch(err) {
		throw err
	}
}

//recursive function to chunk array into a subset of arrays per a defined limiter
function chunkUsersPayload(array, size) {
   if(array.length <= size){
       return [array]
   }
   return [array.slice(0,size), ...chunkUsersPayload(array.slice(size), size)]
}

//generate data payload per bulk user update spec
const payloadGenerator = (usersArray) => {
	const usersPayload = [];
	usersArray.forEach(user=>{
		const email = user.email;
		delete user.email;
		const userPayload = {
			'email':email,
			'preferUserId':false,
			'mergeNestedObjects':false,
			'dataFields': user
		};
		usersPayload.push(userPayload);
	})
	return usersPayload
}

const cleanUserData = (user) => {
	try {
		if(isEqual(Object.keys(user),userKeys)){
			return {
			    firstName: typeof user.firstName == 'string' ? user.firstName : null,
			    lastName: typeof user.lastName == 'string' ? user.lastName : null,
			    email: emailRE.test(user.email) ? user.email : null,
			    favoriteTomato: typeof user.favoriteTomato == 'string' ? user.favoriteTomato : null,
			    totalTomatoOrders: parseInt(user.totalTomatoOrders) || null,
			    daysSinceLastOrder: parseInt(user.daysSinceLastOrder) || null,
			    zip: typeof user.zip == 'string' ? user.zip : null,
			    phoneNumber: typeof user.phoneNumber == 'string' ? user.phoneNumber : null,
			    age: parseInt(user.age) || null,
			    streetAddress: typeof user.streetAddress == 'string' ? user.streetAddress : null,
			    city: typeof user.city == 'string' ? user.city : null,
			    state: typeof user.state == 'string' ? user.state : null,
			    customMessageOne: (typeof user.customMessageOne == 'string') && (user.customMessageOne.length <= 1025) ? user.customMessageOne : null,
			    gender: typeof user.gender == 'string' ? user.gender : null
			}
		} else {
			throw new Error('Incorrect User Keys')
		}
	} catch (err) {
		throw err
	}
}

const processInput = async (pathName) => {
	try {
		//leverage csvtojson to generate array of user objects
		const usersArray = await csv().fromFile(pathName);

		if(usersArray){
			const cleanUsers = usersArray.map(user=>{
				return cleanUserData(user);
			})
			return cleanUsers;
		} else {
			throw new Error('No Data to Process')
		}
		//translate user object to payload called for per the bulk update spec
		const usersPayload = payloadGenerator(usersArray);
		//check array of payloads to limit to 50 users per bulk update request
		const userBatches = chunkUsersPayload(usersPayload,50)
		if(userBatches){
			return userBatches
		} else {
			throw new Error('No Data to Submit')
		}
	} catch (err) {
		throw err 
	}
}

const startJob = async () => {
	const pathName = process.env.PATH_NAME;
	try{
		//create batches limited to 50 user objects per bulk update spec
		const userBatches = await processInput(pathName);
		//generate api request queue
		const results = await executeUserUpdateQueue(userBatches);
		console.log(results)
	} catch (err) {
		throw err 
	}

}

//entry point
if (require.main === module) {
  startJob().catch(err => console.error(err));
};







