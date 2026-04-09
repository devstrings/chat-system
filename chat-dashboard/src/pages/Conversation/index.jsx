import { useParams } from "react-router-dom";


export default function Conversation(props) {
    const { conversationId } = useParams();

    return <>
        <h1>{conversationId}</h1>
    </>
}