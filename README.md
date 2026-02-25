# School App - Complete Solution

A comprehensive school management application with mobile app and backend API, featuring parent gateway, pocket money management, attendance tracking, and performance monitoring.

## 🚀 Features

### Mobile App (React Native + Expo)
- **Multi-role Authentication**: Student, Teacher, Parent, Admin
- **Parent Gateway**: Access children's accounts, top up pocket money, check performance
- **Student Dashboard**: View grades, attendance, pocket money balance
- **Teacher Interface**: Manage classes, mark attendance, update grades
- **Real-time Notifications**: Absence alerts, performance updates, pocket money transactions

### Backend API (Node.js + Express + MongoDB)
- **RESTful API**: Complete CRUD operations for all entities
- **JWT Authentication**: Secure user authentication and authorization
- **MongoDB Integration**: Scalable database with Mongoose ODM
- **Role-based Access Control**: Secure endpoints based on user roles
- **Real-time Updates**: WebSocket support for live notifications

## 🛠️ Tech Stack

### Frontend
- React Native
- Expo SDK 53
- React Navigation
- Expo Notifications
- AsyncStorage

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose ODM
- JWT Authentication
- bcryptjs for password hashing

## 📱 Mobile App Setup

### Prerequisites
- Node.js 18+ or 20 LTS
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd schoolapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm install --workspace=apps/mobile
   ```

3. **Start the mobile app**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Scan QR code with Expo Go app
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator
   - Press 'w' for web browser

## 🖥️ Backend Setup

### Prerequisites
- Node.js 18+ or 20 LTS
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `config.env` to `.env`
   - Update MongoDB connection string
   - Set JWT secret key
   - Configure other environment variables

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 🗄️ Database Setup

### MongoDB Installation

#### Local Installation
1. **Download MongoDB Community Server**
   - Visit [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Choose your platform and version

2. **Install MongoDB**
   ```bash
   # macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # Windows
   # Download and run the installer
   ```

3. **Start MongoDB Service**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Ubuntu/Debian
   sudo systemctl start mongod
   
   # Windows
   # MongoDB runs as a service automatically
   ```

#### Cloud MongoDB (MongoDB Atlas)
1. **Create Atlas Account**
   - Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Choose free tier (M0)
   - Select cloud provider and region
   - Create cluster

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

4. **Update Environment Variables**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/schoolapp
   ```

### Database Initialization

The database will be automatically created when you first run the application. You can also create sample data:

```bash
# Navigate to backend directory
cd backend

# Create sample data (if you have a script)
node scripts/seed-data.js
```

## 🔐 Authentication & Security

### JWT Configuration
- **Secret Key**: Set a strong JWT secret in environment variables
- **Token Expiry**: Configure token expiration time
- **Refresh Tokens**: Implement token refresh mechanism

### Password Security
- **Hashing**: Passwords are hashed using bcryptjs
- **Salt Rounds**: 10 salt rounds for secure hashing
- **Validation**: Minimum 6 characters required

### Role-based Access Control
- **Student**: Access own profile, grades, attendance
- **Parent**: Access children's information, top up pocket money
- **Teacher**: Manage classes, mark attendance, update grades
- **Admin**: Full system access

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout

### Pocket Money
- `GET /api/pocket-money/student/:studentId` - Get student balance
- `POST /api/pocket-money/topup` - Top up pocket money
- `POST /api/pocket-money/spend` - Spend pocket money
- `GET /api/pocket-money/transactions/:studentId` - Transaction history
- `GET /api/pocket-money/parent-summary` - Parent summary
- `POST /api/pocket-money/refund` - Issue refund

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `PUT /api/attendance/:id` - Update attendance
- `GET /api/attendance/summary` - Attendance summary

## 🔔 Notifications

### Push Notifications
- **Absence Alerts**: Notify parents when children are absent
- **Performance Updates**: Alert parents about grade changes
- **Pocket Money**: Confirm top-ups and transactions
- **Attendance Reminders**: Daily attendance notifications

### Notification Types
- **In-App**: Real-time notifications within the app
- **Push Notifications**: External notifications to device
- **Email**: Optional email notifications (future feature)

## 🚀 Deployment

### Mobile App
1. **Build for Production**
   ```bash
   expo build:android  # Android APK
   expo build:ios      # iOS IPA
   ```

2. **Publish to Stores**
   - Google Play Store
   - Apple App Store

### Backend API
1. **Environment Setup**
   - Set production environment variables
   - Configure production MongoDB
   - Set up SSL certificates

2. **Deploy to Cloud**
   - **Heroku**: Easy deployment with Git
   - **AWS**: EC2 or Lambda
   - **Google Cloud**: App Engine or Compute Engine
   - **Azure**: App Service

## 🧪 Testing

### Mobile App Testing
```bash
# Run tests
npm test

# Run on specific platform
npm run android
npm run ios
npm run web
```

### Backend API Testing
```bash
# Run tests
npm test

# Test specific endpoints
curl http://localhost:5000/api/health
```

## 📝 Environment Variables

### Mobile App (.env)
```env
API_BASE_URL=http://localhost:5000/api
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/schoolapp

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:8081

# Notification Configuration
PUSH_NOTIFICATIONS_ENABLED=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Features

- **Real-time Chat**: Communication between teachers and parents
- **Payment Integration**: Secure payment processing for fees
- **Analytics Dashboard**: Advanced reporting and analytics
- **Multi-language Support**: Internationalization
- **Offline Mode**: Work without internet connection
- **AI Integration**: Smart attendance prediction and performance analysis

---

**Built with ❤️ for better education management**
#   s c h o o l a p p  
 #   s c h o o l a p p  
 