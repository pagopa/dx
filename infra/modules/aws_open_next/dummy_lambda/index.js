export const handler = async(event) => {
  console.log("This is a placeholder Lambda function.");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Dummy Lambda - will be overwritten." }),
  };
};
