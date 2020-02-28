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

const executeUserUpdateQueue = async (userBatches) => {
	const userBulkUpdateQueue = userBatches.map(batch=>{
		return throttledBulkUpdate(batch)
	})
	try{
		const results = Promise.all(userBulkUpdateQueue)
		if(results){
			return results
		} else {
			throw new Error('No Results');
		}
	} catch(err) {
		throw err
	}
}

function chunkUsersPayload(array, size) {
   if(array.length <= size){
       return [array]
   }
   return [array.slice(0,size), ...chunkUsersPayload(array.slice(size), size)]
}

const processInput = async (pathName) => {
	try {
		const usersArray = await csv().fromFile(pathName);
		const usersPayload = payloadGenerator(usersArray);
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
		const userBatches = await processInput(pathName);
		const results = await executeUserUpdateQueue(userBatches);
		console.log(results)
	} catch (err) {
		throw err 
	}

}


if (require.main === module) {
  startJob().catch(err => console.error(err));
};







