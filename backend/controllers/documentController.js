const uploadDocument = async (req, res) => {
	res.status(501).json({ message: 'Document uploads are not supported by the current database schema' });
};
module.exports = { uploadDocument };
