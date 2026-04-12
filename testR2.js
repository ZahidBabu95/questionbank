const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const accountId = '86de2d4fc29cfc0d0f118f46e41085c2';
const accessKeyId = 'f7d7e1e49a4589d76adf43c1ca019550';
const secretAccessKey = '5f1d415aa7aecc55bf90e7d290ed3f9e9ad69895a8e52d25f221dd65861e1b36';
const bucketName = 'sl-checkout-invoice';
const publicUrlBase = 'https://pub-877664dc8f4f473da7cdcb7fe3b32a76.r2.dev';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
});

async function run() {
    try {
        const key = 'ai_imports/images/test.txt';
        const body = 'Testing Upload';
        
        await s3Client.send(new PutObjectCommand({ 
            Bucket: bucketName, 
            Key: key, 
            Body: body, 
            ContentType: 'text/plain' 
        }));
        console.log('Upload successful!');
        
        const testUrl = `${publicUrlBase}/${key}`;
        console.log('Testing public URL:', testUrl);
        
        const res = await fetch(testUrl);
        console.log('Status:', res.status);
    } catch (e) {
        console.error('Error:', e);
    }
}
run();
