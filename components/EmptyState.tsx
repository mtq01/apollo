// declare type interface
// https://www.typescriptlang.org/docs/handbook/2/objects.html
// interface types for components are best left in the component file. from what i read its just easier to understand/follow this way.
interface EmptyStateProps {
  message: string;
}

// create function to display empty state
// this is what the user sees before they have searched for any product data or added any previous orders.
function EmptyState({ message }: EmptyStateProps) {
  return <p>{message}</p>;
}

export default EmptyState;

// https://nextjs.org/learn/react-foundations/displaying-data-with-props
