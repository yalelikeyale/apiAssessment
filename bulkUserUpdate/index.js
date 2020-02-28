'use strict';

const axios = require('axios');
const csv = require('csvtojson');
const Bottleneck = require('bottleneck')

// set environment variables
require('dotenv').config();

const limiter = new Bottleneck({
	minTime:250,
	maxConcurrent:1
})


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

//stackoverflow is a godsend
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

const processInput = async (pathName) => {
	try {
		//leverage csvtojson to generate array of user objects
		const usersArray = await csv().fromFile(pathName);
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







