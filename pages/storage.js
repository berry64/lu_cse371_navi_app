import React, { useState, useEffect, useContext } from 'react';
import { Alert, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Text, Checkbox, Colors, IconButton, List, Modal, Portal, ProgressBar, Subheading, TextInput } from 'react-native-paper';
import ctx from '../global';

const db_url = 'http://192.168.1.2:8080/';
const categories = [
    {
        name: 'Food',
        icon: 'food',
    },
    {
        name: 'Clothes',
        icon: 'tshirt-crew',
    },
    {
        name: 'Misc',
        icon: 'star',
    }
]

export default function Storage() {
    const [modal, setModal] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [code, setCode] = useState('');
    const [total, setTotal] = useState(0);
    const [savedDatabases, setSavedDatabases] = useState([]);
    const { selected, setSelected, setFilters } = useContext(ctx);
    const [selectedCategory, setSelectedCategory] = useState([]);

    useEffect(async () => {try {
        let files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        setSavedDatabases(files.filter(file => file.endsWith(".js")).map(file => {
            file.replace(".js", "");
        }));
    } catch(e) { console.log(e); }}, []);

    return (
        <View style={{
            width: '80%',
            maxHeight: '80%',
            marginTop: '10%',
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
        }}>
            {modal ? <View>
                    {downloading ? <>
                        <Text>Downloading...{progress}/{total}</Text>
                        <ProgressBar progress={progress / total} />
                    </> : <>
                        <Text>Enter the code you would like to download:</Text>
                        <TextInput
                            label='Code'
                            value={code}
                            onChangeText={setCode}
                            onSubmitEditing={() => {
                                console.log(code);
                                FileSystem.downloadAsync(db_url + code, FileSystem.documentDirectory + code + ".json")
                                    .then(({ uri }) => {
                                        FileSystem.readAsStringAsync(uri).then(data => {
                                            try {
                                                let list = JSON.parse(data);
                                                list.forEach(item => {
                                                    FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'audio').then(() => {
                                                        FileSystem.downloadAsync(db_url + item.audio, FileSystem.documentDirectory + item.audio)
                                                            .then(({ uri }) => {
                                                                setProgress(p => p + 1);
                                                                if(progress === total) {
                                                                    setModal(false);
                                                                    setProgress(0);
                                                                    setTotal(0);
                                                                    Alert.alert('Download Complete');
                                                                }
                                                            }, error => {
                                                                console.log(error);
                                                                Alert.alert('Error', 'Failed to download file');
                                                                setDownloading(false);
                                                                setTotal(0);
                                                                setProgress(0);
                                                            });
                                                    });
                                                });
                                                setTotal(list.length);
                                                setDownloading(true);
                                            } catch (e) {
                                                Alert.alert("Invalid file downloaded, please contact administrator");
                                            }
                                        });
                                    }, error => {
                                        console.error(error);
                                        Alert.alert('Error', 'Cannot download database, make sure the code is correct.');
                                    });
                            }}
                        />
                    </>}
                    </View>: <>
            <View>
                <Subheading>Categories</Subheading>
                {categories.map(category => (
                    <Checkbox.Item
                        key={category.name}
                        label={category.name}
                        icon={category.icon}
                        status={selectedCategory.includes(category.name) ? 'checked' : 'unchecked'}
                        onPress={() => {
                            if(selectedCategory.includes(category.name)) {
                                setSelectedCategory(selectedCategory.filter(c => c !== category.name));
                            } else {
                                setSelectedCategory([...selectedCategory, category.name]);
                            }
                            setFilters(selectedCategory.length === 0 ? [] : selectedCategory);
                        }}
                    />))}
            </View>
            <List.Section>
                <List.Subheader>Downloaded Databases</List.Subheader>
                <List.Item title="Add new" left={() => <List.Icon icon="plus" />}
                    onPress={() => setModal(true)} />
                {savedDatabases.length > 0 ? 
                savedDatabases.map(db => <List.Item title={db.name} key={db.name} color={selected==db.name?Colors.blue600:Colors.black} onPress={() => {
                    setSelected(db.name);
                }} right={() => <IconButton color={Colors.red500} icon="delete" onPress={() => {
                    FileSystem.readAsStringAsync(FileSystem.documentDirectory + db.name + ".json").then(data => {
                        let list = JSON.parse(data);
                        list.forEach(item => {
                            FileSystem.deleteAsync(FileSystem.documentDirectory + item.audio);
                        });
                        FileSystem.deleteAsync(FileSystem.documentDirectory + db.name + ".json");
                        Alert.alert('Database deleted');
                    });
                }}/>}/>)
                : <List.Item title="No databases downloaded" />}
            </List.Section>
            </>}
        </View>
    )
}