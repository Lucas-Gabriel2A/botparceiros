
// Pure JS script to avoid TS issues
const https = require('https');

const accessToken = 'TEST-1826830300308599-020423-a97f5cf3cc016e6a7f5f672d8c997630-1117308706';

function check() {
    console.log("🔍 Checking Mercadopago Credentials...");
    console.log(`🔑 Access Token: ${accessToken.substring(0, 20)}...`);

    const options = {
        hostname: 'api.mercadopago.com',
        path: '/users/me',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error("❌ Failed to fetch user info:", res.statusCode);
                console.error("Body:", data);
                return;
            }

            try {
                const userData = JSON.parse(data);
                console.log("\n✅ Credentials Valid! Account Info Found:");
                console.log("------------------------------------------------");
                console.log("🆔 User ID:", userData.id);
                console.log("👤 Full Name:", `${userData.first_name} ${userData.last_name}`);
                console.log("📛 Nickname:", userData.nickname);
                console.log("🏢 Company Name:", userData.company?.corporate_name || 'N/A');
                console.log("📧 Email:", userData.email);
                console.log("------------------------------------------------");

                if (userData.nickname === 'PegaMeuKit' || (userData.company && userData.company.corporate_name === 'PegaMeuKit')) {
                    console.log("🚨 FOUND IT! 'PegaMeuKit' comes from your Account Nickname or Company Name.");
                } else {
                    console.log("ℹ️ The name likely comes from the 'Application' settings in the dev panel.");
                }

                // Simulate PreApproval to see if we can trigger the name
                createTestPreApproval();

            } catch (e) {
                console.error("Error parsing JSON:", e);
            }
        });
    });

    req.on('error', (e) => {
        console.error("❌ Request Error:", e);
    });

    req.end();
}

function createTestPreApproval() {
    console.log("\n🧪 Simulating PreApproval Creation...");
    const postData = JSON.stringify({
        reason: "CoreBot Test Subscription",
        auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: 10,
            currency_id: "BRL"
        },
        back_url: "https://google.com",
        payer_email: "test_user_123@test.com",
        external_reference: "test_ref_123",
        status: "pending"
    });

    const options = {
        hostname: 'api.mercadopago.com',
        path: '/preapproval',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode !== 201) {
                console.error("❌ Failed to create PreApproval:", res.statusCode);
                console.error("Body:", data);
            } else {
                const json = JSON.parse(data);
                console.log("✅ PreApproval Created!");
                console.log("🔗 Init Point:", json.init_point);
                console.log("ℹ️ Open this link in incognito to see what name appears.");
            }
        });
    });

    req.write(postData);
    req.end();
}

// checkApplications(); // Skip this as it likely fails without scope
// check(); // Skip user check for now
createTestPreApproval();
