// define the TYPE expected. since its an error msg, its a string.
// later this might need to change, since we will be passing an object of various errors instead of hardcoding.
// this is all we need for day 3
// https://www.typescriptlang.org/docs/handbook/2/objects.html
interface DisplayErrorProps {
  error: string;
}

// create the function with error prop. define the type
function DisplayError({ error }: DisplayErrorProps) {
    // placeholder text for now
  return <h1>{error}</h1>;
}

export default DisplayError;

// https://nextjs.org/learn/react-foundations/displaying-data-with-props
