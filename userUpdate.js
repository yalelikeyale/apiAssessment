'use strict';

const axios = require('axios');
const csv = require('csvtojson');
const Bottleneck = require('bottleneck');

// set environment variables
require('dotenv').config();

//limit api requests to 10 per second well within 500 could prob speed up
const limiter = new Bottleneck({
	minTime:100,
	maxConcurrent:1
})

//translate user object to request payload per user update spec
const genRequestPromise = (user) => {
	const email = user.email;
	delete user.email;
	const axiosConfig = {
		url:'https://api.iterable.com/api/users/update',
		method:'post',
		headers:{
			'Api-Key':process.env.API_KEY
		},
		data:{
			'email':email ,
			'preferUserId':false,
			'mergeNestedObjects':false,
			'dataFields':user 
		}
	} 
	return axios(axiosConfig)
}
//leverage Bottleneck package to rate limit api requests
const throttledUserUpdate = limiter.wrap(genRequestPromise);


const executeUserUpdateQueue = async (users) => {
	//generate array of axios request promises
	const userUpdateQueue = users.map(user=>{
		return throttledUserUpdate(user)
	})
	try{
		//Execute rate limited promise queue
		const results = await Promise.all(userUpdateQueue)
		if(results){
			return results
		} else {
			throw new Error('No Results');
		}
	} catch(err) {
		throw err
	}
}

// const processResults = () => {
// 	//loop through results and 
// 		//generate success metrics 
// 		//save index positions of failures for retry if appropriate
// }

const processInput = async (pathName) => {
	try {
		//leverage csvtojson to create array of user objects from CSV
		const usersArray = await csv().fromFile(pathName);
		if(usersArray){
			return usersArray
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
		//read in CSV 
		const users = await processInput(pathName);
		//generate api requests from array of user objects
		const results = await executeUserUpdateQueue(users)
		console.log(results)
		//looks like the api responds with some useful info for reprocessing & metrics
		// processResults()
	} catch (err) {
		throw err 
	}

}

//entry point
if (require.main === module) {
  startJob().catch(err => console.error(err));
};







