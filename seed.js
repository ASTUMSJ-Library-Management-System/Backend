const bcrypt = require("bcryptjs");
const User = require("./models/User");

/**
 * Ensures a default admin user exists in the database.
 * If the user exists but has a different password or role, it updates them.
 * This is a safe operation to run on every server start.
 */
async function ensureAdminUserExists() {
  const adminEmail = "LinT@admin.com";
  const adminPlainPassword = "12345678";
  const adminRole = "admin";

  try {
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      // Admin exists, check if password or role needs an update
      const isPasswordCorrect = await bcrypt.compare(
        adminPlainPassword,
        adminUser.password
      );
      if (adminUser.role !== adminRole || !isPasswordCorrect) {
        console.log("Updating existing admin user's details...");
        const hashedPassword = await bcrypt.hash(adminPlainPassword, 10);
        adminUser.password = hashedPassword;
        adminUser.role = adminRole;
        await adminUser.save();
        console.log(`Admin user ${adminEmail} was updated.`);
      }
    } else {
      // Admin does not exist, create a new one
      console.log(`Admin user ${adminEmail} not found. Creating...`);
      const hashedPassword = await bcrypt.hash(adminPlainPassword, 10);

      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        department: "Administration",
        idPicture: "default_admin_id.png", // A placeholder value
        role: adminRole,
      });
      console.log(`Admin user ${adminEmail} created successfully.`);
    }
  } catch (error) {
    console.error("Error during admin user seeding:", error);
  }
}

module.exports = { ensureAdminUserExists };