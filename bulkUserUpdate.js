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

//recursive function to chunk array into a subset of arrays per with up to the defined maximum
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
			    firstName: user.firstName.trim() ? user.firstName.trim() : null,
			    lastName: user.lastName.trim() ? user.lastName.trim() : null,
			    email: emailRE.test(user.email) ? user.email : null,
			    favoriteTomato: user.favoriteTomato ? user.favoriteTomato.trim() : null,
			    totalTomatoOrders: parseInt(user.totalTomatoOrders) || null,
			    daysSinceLastOrder: parseInt(user.daysSinceLastOrder) || null,
			    zip: user.zip.length == 5? parseInt(user.zip) : null || null,
			    phoneNumber: user.phoneNumber.trim() ? user.phoneNumber : null,
			    age: parseInt(user.age) || null,
			    streetAddress: user.streetAddress.trim() ? user.streetAddress : null,
			    city: user.city.trim() ? user.city.trim() : null,
			    state: user.state.trim() ? user.state.trim() : null,
			    customMessageOne: (user.customMessageOne.trim()) && (user.customMessageOne.length <= 1025) ? user.customMessageOne : null,
			    gender: user.gender.trim()? user.gender.trim() : null
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
			// pass each user object through data validation function
			const cleanUsers = usersArray.map(user=>{
				return cleanUserData(user);
			})
			// filter for users with a valid email 
			const filteredUsers = cleanUsers.filter(user=>user.email);
			if(filteredUsers.length > 0){
				console.log(`${cleanUsers.length - filteredUsers.length} Users dropped from job due to invalid Email`);
				//translate user object to payload called for per the bulk update spec
				const usersPayload = payloadGenerator(filteredUsers);
				//chunck array of payloads to limit to 50 users per bulk update request
				const userBatches = chunkUsersPayload(usersPayload,50);
				return userBatches
			} else {
				throw new Error('No valid User Emails')
			}
		} else {
			throw new Error('No Data to Process')
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
		console.log(results);
		//process results - success metrics + retry
	} catch (err) {
		throw err 
	}

}

//entry point
if (require.main === module) {
  startJob().catch(err => console.error(err));
};







