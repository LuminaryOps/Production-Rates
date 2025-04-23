const { MongoClient } = require('mongodb');
const jwtDecode = require('jwt-decode');

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// Verify JWT token from Netlify Identity
function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, userId: 'anonymous' };
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwtDecode(token);
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (decoded.exp && decoded.exp < currentTime) {
      return { isValid: false, userId: 'anonymous' };
    }
    
    return { 
      isValid: true, 
      userId: decoded.sub || 'anonymous' 
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { isValid: false, userId: 'anonymous' };
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request body' })
    };
  }
  
  // Verify authentication
  const authHeader = event.headers.authorization;
  const { isValid, userId } = verifyToken(authHeader);
  
  // Use provided userId or fallback from token or use anonymous
  const userFolder = body.userId || userId || 'anonymous';
  
  try {
    // Connect to MongoDB
    await client.connect();
    const database = client.db('luminaryops');
    const collection = database.collection('calendar');
    
    // Get calendar data for this user
    const calendarData = await collection.findOne({ userId: userFolder });
    
    if (!calendarData) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            bookedDates: {},
            blockedDates: {}
          }
        })
      };
    }
    
    // Return only the necessary data
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          bookedDates: calendarData.bookedDates || {},
          blockedDates: calendarData.blockedDates || {}
        }
      })
    };
  } catch (error) {
    console.error('Error retrieving calendar data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Error retrieving calendar data' })
    };
  } finally {
    await client.close();
  }
};
