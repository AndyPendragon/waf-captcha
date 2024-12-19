import  { useState } from "react";

const App = () => {
  const [userInputNumber, setUserInputNumber] = useState(0);
  const [apiRequestResults, setApiRequestResults] = useState([]);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false);
  const [awsWafToken, setAwsWafToken] = useState("");

  const handleFormSubmission = async (event) => {
    event.preventDefault();
    const numberEnteredByUser = parseInt(event.target.elements.numberInput.value, 10);
    setUserInputNumber(numberEnteredByUser);
    setIsFormSubmitted(true);
    setApiRequestResults([]);
    await executeApiRequestsSequentially(numberEnteredByUser);
  };

  const executeApiRequestsSequentially = async (totalRequests) => {
    for (let requestIndex = 1; requestIndex <= totalRequests; requestIndex++) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay 1 second
      const apiResponseStatus = await performApiRequest(requestIndex);
      setApiRequestResults((previousResults) => [
        ...previousResults,
        { requestIndex, apiResponseStatus },
      ]);
      if (apiResponseStatus === 405) {
        setIsCaptchaRequired(true);
        break;
      }
    }
  };

  const performApiRequest = async (currentRequestIndex) => {
    const apiUrl = "https://api.prod.jcloudify.com/whoami";
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "aws-waf-token": awsWafToken,
        },
      });
      return response.status;
    } catch (error) {
      console.error(`Request ${currentRequestIndex} failed with error:`, error);
      return 500;
    }
  };

  const handleCaptchaResolution = () => {
    const captchaScriptElement = document.createElement("script");
    captchaScriptElement.type = "text/javascript";
    captchaScriptElement.src = import.meta.env.VITE_CAPTCHA_SCRIPT_URL;
    captchaScriptElement.defer = true;
    
    captchaScriptElement.onload = () => {
      initializeCaptcha();
    };

    document.body.appendChild(captchaScriptElement);
  };

  const initializeCaptcha = () => {
    window.CaptchaSDK.init({
      siteKey: import.meta.env.VITE_CAPTCHA_API_KEY,
      callback: handleCaptchaResolved,
    });
  };

  const handleCaptchaResolved = (resolvedCaptchaToken) => {
    setCaptchaToken(resolvedCaptchaToken);
    setAwsWafToken(resolvedCaptchaToken);
    setIsCaptchaRequired(false);
    executeRemainingRequestsAfterCaptcha();
  };

  const executeRemainingRequestsAfterCaptcha = async () => {
    const completedRequestsCount = apiRequestResults.length;
    const remainingRequestsCount = userInputNumber - completedRequestsCount;
    await executeApiRequestsSequentially(remainingRequestsCount);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {!isFormSubmitted ? (
        <form onSubmit={handleFormSubmission}>
          <input
            type="number"
            name="numberInput"
            min="1"
            max="1000"
            placeholder="Enter a number"
            required
          />
          <button type="submit">Submit</button>
        </form>
      ) : isCaptchaRequired ? (
        <div>
          <h3>Captcha required! Solve it to continue.</h3>
          <button onClick={handleCaptchaResolution}>Solve Captcha</button>
        </div>
      ) : (
        <ul>
          {apiRequestResults.map(({ requestIndex, apiResponseStatus }) => (
            <li key={requestIndex}>
              Request {requestIndex} - Response {apiResponseStatus}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default App;
