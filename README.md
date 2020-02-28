# **API Assessment**

### **Description:**
Read in a CSV file and write two separate API calls:
1. User Update (POST /api/users/update)
- userUpdate.js
2. Bulk User Update (POST /api/users/bulkUpdate)
- bulkUserUpdate.js

### **Implementation**

1. Clone the Repo
2. Install the dependencies by executing `npm install`
3. Create a file named ".env" that contains the following text:
   
   `API_KEY={ENTER YOUR API KEY HERE}`
   
   `PATH_NAME='./tomato_users.csv'`
   
4. Profit
- For Bulk Update, run: `node bulkUserUpdate.js`
- For User Update, run: `node userUpdate.js`

   
   
