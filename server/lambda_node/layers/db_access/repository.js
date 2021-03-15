// unifiedItem: {
//     "PKCombined": $email,
//     "id": $id,
//     "itemType": $
// }

const sort_key_prefixes = {
    "key": "k#", 
    "metadata": "m#",
    "session": "s#",
};

const item_types = [ "key", "metadata", "session" ];

function process_incoming_item (item, itemType) {
    const {id: itemid = "", ...processed_item} = item;

    processed_item.skcombined = sort_key_prefixes[itemtype] + itemid;
    

    switch (itemid) {
        case identifiers.key:
            let {id, email, ...processed_item} = itemcopy;
            
            processed_item.skcombined = "#k" + id;
            break;
        case item_identifiers.metadata:
            processed_item = itemcopy;
            processed_item.skcombined = "m#";
        case item_identifiers.session:
            
    }
}
