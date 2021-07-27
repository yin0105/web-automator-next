#!perl
use strict;
use POSIX;
use HTTP::Request::Common;
use LWP::UserAgent;
use JSON;
use File::Basename;

sub readFile {
  my $result = "";
  open(TEXT, shift);
  while(<TEXT>) {
    my $line = $_;
    my @result = split /;/, $line;
    for (@result) {
      $result .= $_ . "\n";
    }
  }
  close(TEXT);
  return $result;
}

my $json = JSON->new->allow_nonref;
my $requestID = shift;
my $dirname = dirname(__FILE__)."/.for-perl/$requestID";

my $loc = setlocale( LC_ALL, "C" );
my $authcode = POSIX::strftime("%a %b %d %Y",localtime) ^ "aoenthus-2c'34pnq";
setlocale ( LC_ALL, $loc);

print LWP::UserAgent->new->request(
  HTTP::Request::Common::POST readFile("$dirname/uri"),
    [
      json => readFile("$dirname/body"),
      auth => $authcode,
    ],
    'Content-Type' => 'multipart/form-data'
)->content;

