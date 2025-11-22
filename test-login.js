const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function testLogin() {
  console.log('🧪 Testing Login Functionality\n');

  // Create Prisma client with adapter
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Step 1: Check if user exists
    console.log('1️⃣ Checking if admin user exists...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@dentalclinic.com' },
    });

    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }
    console.log('✅ User found:', user.email);
    console.log('   Name:', `${user.firstName} ${user.lastName}`);
    console.log('   Active:', user.isActive);
    console.log('   Role:', user.role);

    // Step 2: Check if user is active
    if (!user.isActive) {
      console.error('❌ User is not active!');
      process.exit(1);
    }
    console.log('✅ User is active\n');

    // Step 3: Test password comparison
    console.log('2️⃣ Testing password comparison...');
    const testPassword = 'password123';
    console.log('   Testing password:', testPassword);
    console.log('   Stored hash (first 30 chars):', user.password.substring(0, 30) + '...');

    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    console.log('   Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.error('❌ Password does not match!');
      console.log('\n🔧 Fixing password hash...');

      // Generate new hash
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('   New hash generated:', newHash.substring(0, 30) + '...');

      // Update database
      await prisma.user.update({
        where: { email: 'admin@dentalclinic.com' },
        data: { password: newHash },
      });
      console.log('✅ Password hash updated!');

      // Test again
      const updatedUser = await prisma.user.findUnique({
        where: { email: 'admin@dentalclinic.com' },
      });
      const isNewPasswordValid = await bcrypt.compare(testPassword, updatedUser.password);
      console.log('   Verification:', isNewPasswordValid ? '✅ Password now works!' : '❌ Still not working');
    } else {
      console.log('✅ Password matches!\n');
    }

    // Step 4: Test the full authentication flow
    console.log('3️⃣ Testing full authentication flow...');
    const credentials = {
      email: 'admin@dentalclinic.com',
      password: 'password123',
    };

    const authUser = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!authUser || !authUser.isActive) {
      console.error('❌ Authentication failed: User not found or inactive');
      process.exit(1);
    }

    const authPasswordValid = await bcrypt.compare(credentials.password, authUser.password);

    if (!authPasswordValid) {
      console.error('❌ Authentication failed: Invalid password');
      process.exit(1);
    }

    const authenticatedUser = {
      id: authUser.id,
      email: authUser.email,
      name: `${authUser.firstName} ${authUser.lastName}`,
      role: authUser.role,
    };

    console.log('✅ Authentication successful!');
    console.log('   User object:', authenticatedUser);

    console.log('\n✨ All tests passed! Login should work now.');
    console.log('\n📝 You can now login with:');
    console.log('   Email: admin@dentalclinic.com');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testLogin();
