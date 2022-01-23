const cookiesKidUrl = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys';
const COOKIE_KEYS = ['skIBNg', '7TX2ew', '0pR3Ww', 'tB0M2A', 'tlGYHA'];

const tokenKidUrl =
	'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const TOKEN_KEYS = [
	'1d2a6a6a472aca63f3af756621f34686925b51a8',
	'3506f3752247fcf94cbe5d2d6b59fa8a2bab1ec2'
];

const validIssuers = ['https://session.firebase.google.com/', 'https://securetoken.google.com/'];

function getValidIssuers() {
	const projectId = '';
	return validIssuers.map((iss) => iss + projectId);
}
