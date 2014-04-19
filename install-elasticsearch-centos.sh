# install missing libraries (if any)
cd ~
sudo yum update
yum install java-1.7.0-openjdk.x86_64
yum install unzip
yum install mc
yum install wget
yum install curl

# get and unpack elasticsearch zip file
cd /etc
wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-0.90.7.zip
unzip elasticsearch-0.90.7.zip
rm elasticsearch-0.90.7.zip
mv elasticsearch-0.90.7 elasticsearch

# install elasticsearch plugins
cd elasticsearch/bin
./plugin -install mobz/elasticsearch-head
./plugin -install karmi/elasticsearch-paramedic
./plugin -url http://bit.ly/GMYV9l -install river-jdbc
cd /etc/elasticsearch/lib
wget http://qiiip.org/mysql-connector-java-5.1.26-bin.jar

# make elasticsearch runnable as a service
cd ~
curl -L http://github.com/elasticsearch/elasticsearch-servicewrapper/tarball/master | tar -xz
mv *servicewrapper*/service /etc/elasticsearch/bin/
rm -Rf *servicewrapper*
sudo /etc/elasticsearch/bin/service/elasticsearch install

# set elasticsearch to run on boot
sudo /sbin/chkconfig elasticsearch on
sudo /sbin/chkconfig --list

# open port 9200 (for http) and 9300 (for tcp)
sudo iptables -L -n
iptables -A INPUT -p tcp -m tcp --dport 9200 -j ACCEPT
iptables -A INPUT -p tcp -m tcp --dport 9300 -j ACCEPT
service iptables save

# set min max memory variables
export ES_MIN_MEM=5G
export ES_MAX_MEM=5G

# restart server
service elasticsearch restart
tail -f /etc/elasticsearch/logs/elasticsearch.log